#pragma once

#include <string>
#include <vector>
#include <functional>

class HttpClient {
public:
    HttpClient();
    ~HttpClient();

    // Set cookies from file
    bool set_cookies_from_file(const std::string& cookie_file);

    // Fetch artwork metadata from Pixiv API
    bool fetch_artwork_info(const std::string& artwork_id, std::string& out_json);

    // Download file with progress callback
    bool download_file(const std::string& url, const std::string& output_path,
                       std::function<void(size_t, size_t)> progress_callback = nullptr);

private:
    void* curl_handle_;
    std::string cookies_;
    
    static size_t write_callback(void* contents, size_t size, size_t nmemb, void* userp);
    static size_t header_callback(char* buffer, size_t size, size_t nitems, void* userdata);
    static int progress_callback(void* clientp, curl_off_t dltotal, curl_off_t dlnow,
                                curl_off_t ultotal, curl_off_t ulnow);
};
