#include "http_client.h"
#include <curl/curl.h>
#include <fstream>
#include <iostream>
#include <sstream>
#include <cstdio>  // for std::remove

HttpClient::HttpClient() : curl_handle_(nullptr) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl_handle_ = curl_easy_init();
}

HttpClient::~HttpClient() {
    if (curl_handle_) {
        curl_easy_cleanup(curl_handle_);
    }
    curl_global_cleanup();
}

bool HttpClient::set_cookies_from_file(const std::string& cookie_file) {
    std::ifstream file(cookie_file);
    if (!file.is_open()) {
        std::cerr << "Error: Cannot open cookie file: " << cookie_file << std::endl;
        return false;
    }

    std::string line;
    cookies_.clear();
    
    while (std::getline(file, line)) {
        // Trim whitespace
        line.erase(0, line.find_first_not_of(" \t\r\n"));
        line.erase(line.find_last_not_of(" \t\r\n") + 1);
        
        // Skip empty lines and comments
        if (line.empty() || line[0] == '#') {
            continue;
        }
        
        // Add to cookies
        cookies_ += line;
        if (!line.empty() && line.back() != ';') {
            cookies_ += "; ";
        }
    }

    if (cookies_.empty()) {
        std::cerr << "Error: Cookie file is empty or invalid" << std::endl;
        return false;
    }

    std::cout << "Loaded cookies from file" << std::endl;
    return true;
}

size_t HttpClient::write_callback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total_size = size * nmemb;
    std::string* str = static_cast<std::string*>(userp);
    str->append(static_cast<char*>(contents), total_size);
    return total_size;
}

size_t HttpClient::header_callback(char* buffer, size_t size, size_t nitems, void* userdata) {
    return size * nitems;
}

size_t HttpClient::file_write_callback(void* ptr, size_t size, size_t nmemb, void* stream) {
    std::ofstream* out = static_cast<std::ofstream*>(stream);
    size_t total = size * nmemb;
    out->write(static_cast<char*>(ptr), total);
    return out->good() ? total : 0;
}

int HttpClient::progress_callback(void* clientp, curl_off_t dltotal, curl_off_t dlnow,
                                  curl_off_t ultotal, curl_off_t ulnow) {
    if (dltotal > 0) {
        double progress = (double)dlnow / (double)dltotal * 100.0;
        std::cout << "\rDownload progress: " << (int)progress << "% (" 
                  << dlnow / 1024 << " KB / " << dltotal / 1024 << " KB)" << std::flush;
    }
    return 0;
}

bool HttpClient::fetch_artwork_info(const std::string& artwork_id, std::string& out_json) {
    if (!curl_handle_) {
        return false;
    }

    std::string url = "https://www.pixiv.net/ajax/illust/" + artwork_id;
    std::string response;

    curl_easy_reset(curl_handle_);
    curl_easy_setopt(curl_handle_, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl_handle_, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl_handle_, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl_handle_, CURLOPT_COOKIE, cookies_.c_str());
    curl_easy_setopt(curl_handle_, CURLOPT_USERAGENT, 
                     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    curl_easy_setopt(curl_handle_, CURLOPT_REFERER, "https://www.pixiv.net/");
    curl_easy_setopt(curl_handle_, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl_handle_, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl_handle_, CURLOPT_SSL_VERIFYHOST, 2L);

    CURLcode res = curl_easy_perform(curl_handle_);
    
    if (res != CURLE_OK) {
        std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
        return false;
    }

    long http_code = 0;
    curl_easy_getinfo(curl_handle_, CURLINFO_RESPONSE_CODE, &http_code);
    
    if (http_code != 200) {
        std::cerr << "HTTP error: " << http_code << std::endl;
        return false;
    }

    out_json = response;
    return true;
}

bool HttpClient::download_file(const std::string& url, const std::string& output_path,
                               std::function<void(size_t, size_t)> progress_callback) {
    if (!curl_handle_) {
        return false;
    }

    std::ofstream outfile(output_path, std::ios::binary);
    if (!outfile.is_open()) {
        std::cerr << "Cannot open output file: " << output_path << std::endl;
        return false;
    }

    curl_easy_reset(curl_handle_);
    curl_easy_setopt(curl_handle_, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl_handle_, CURLOPT_WRITEFUNCTION, HttpClient::file_write_callback);
    curl_easy_setopt(curl_handle_, CURLOPT_WRITEDATA, &outfile);
    curl_easy_setopt(curl_handle_, CURLOPT_COOKIE, cookies_.c_str());
    curl_easy_setopt(curl_handle_, CURLOPT_USERAGENT,
                     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    curl_easy_setopt(curl_handle_, CURLOPT_REFERER, "https://www.pixiv.net/");
    curl_easy_setopt(curl_handle_, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl_handle_, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl_handle_, CURLOPT_SSL_VERIFYHOST, 2L);
    
    // Progress callback
    curl_easy_setopt(curl_handle_, CURLOPT_XFERINFOFUNCTION, HttpClient::progress_callback);
    curl_easy_setopt(curl_handle_, CURLOPT_NOPROGRESS, 0L);

    CURLcode res = curl_easy_perform(curl_handle_);
    
    // Ensure file is flushed and closed before checking result
    outfile.flush();
    outfile.close();

    if (res != CURLE_OK) {
        std::cerr << "\ncurl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
        // Delete corrupted file
        std::remove(output_path.c_str());
        return false;
    }

    long http_code = 0;
    curl_easy_getinfo(curl_handle_, CURLINFO_RESPONSE_CODE, &http_code);
    
    if (http_code != 200) {
        std::cerr << "\nHTTP error: " << http_code << std::endl;
        // Delete corrupted file
        std::remove(output_path.c_str());
        return false;
    }

    std::cout << "\n";
    return true;
}
