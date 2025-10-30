#include "pixiv_downloader.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>
#include <regex>
#include <filesystem>
#include <algorithm>

#ifdef _WIN32
#include <windows.h>
#include <direct.h>
#define mkdir(dir, mode) _mkdir(dir)
#else
#include <sys/stat.h>
#include <sys/types.h>
#endif

using json = nlohmann::json;
namespace fs = std::filesystem;

PixivDownloader::PixivDownloader(const ProgramArgs& args)
    : args_(args) {
    
    // Initialize database
    std::string db_path = args_.download_dir + "/downloaded.db";
    db_ = std::make_unique<Database>(db_path);
    
    // Initialize HTTP client
    http_client_ = std::make_unique<HttpClient>();
}

PixivDownloader::~PixivDownloader() = default;

std::vector<std::string> PixivDownloader::read_urls_from_file(const std::string& file_path) {
    std::vector<std::string> urls;
    std::ifstream file(file_path);
    
    if (!file.is_open()) {
        std::cerr << "Error: Cannot open input file: " << file_path << std::endl;
        return urls;
    }

    std::string line;
    while (std::getline(file, line)) {
        // Trim whitespace
        line.erase(0, line.find_first_not_of(" \t\r\n"));
        line.erase(line.find_last_not_of(" \t\r\n") + 1);
        
        // Skip empty lines and comments
        if (line.empty() || line[0] == '#') {
            continue;
        }
        
        // Check if it's a valid Pixiv URL
        if (line.find("pixiv.net") != std::string::npos) {
            urls.push_back(line);
        }
    }

    return urls;
}

std::string PixivDownloader::extract_artwork_id(const std::string& url) {
    // Extract artwork ID from URL like https://www.pixiv.net/artworks/123456
    std::regex id_regex(R"(artworks/(\d+))");
    std::smatch match;
    
    if (std::regex_search(url, match, id_regex)) {
        return match[1].str();
    }
    
    return "";
}

bool PixivDownloader::ensure_directory_exists(const std::string& path) {
    try {
        fs::create_directories(path);
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error creating directory: " << e.what() << std::endl;
        return false;
    }
}

std::string PixivDownloader::sanitize_filename(const std::string& filename) {
    std::string safe = filename;
    // Replace invalid characters with underscore
    const std::string invalid_chars = "<>:\"/\\|?*";
    for (char& c : safe) {
        if (invalid_chars.find(c) != std::string::npos) {
            c = '_';
        }
    }
    return safe;
}

std::vector<std::string> PixivDownloader::parse_image_urls(const std::string& json_data, 
                                                            const std::string& artwork_id) {
    std::vector<std::string> image_urls;
    
    try {
        auto j = json::parse(json_data);
        
        if (j.contains("error") && j["error"] == true) {
            std::cerr << "Error from API: " << j.value("message", "Unknown error") << std::endl;
            return image_urls;
        }
        
        if (!j.contains("body")) {
            std::cerr << "Invalid JSON response: missing 'body' field" << std::endl;
            return image_urls;
        }
        
        auto body = j["body"];
        
        // Get original image URLs
        if (body.contains("urls") && body["urls"].contains("original")) {
            std::string original_url = body["urls"]["original"];
            image_urls.push_back(original_url);
        }
        
        // For multi-page artworks, get all pages
        if (body.contains("pageCount") && body["pageCount"].get<int>() > 1) {
            int page_count = body["pageCount"];
            
            // Need to fetch pages metadata
            std::string pages_url = "https://www.pixiv.net/ajax/illust/" + artwork_id + "/pages";
            std::string pages_json;
            
            if (http_client_->fetch_artwork_info(artwork_id + "/pages", pages_json)) {
                auto pages_data = json::parse(pages_json);
                
                if (pages_data.contains("body") && pages_data["body"].is_array()) {
                    image_urls.clear(); // Clear the single URL
                    
                    for (const auto& page : pages_data["body"]) {
                        if (page.contains("urls") && page["urls"].contains("original")) {
                            image_urls.push_back(page["urls"]["original"]);
                        }
                    }
                }
            }
        }
        
    } catch (const json::exception& e) {
        std::cerr << "JSON parse error: " << e.what() << std::endl;
    }
    
    return image_urls;
}

bool PixivDownloader::download_artwork(const std::string& artwork_id) {
    std::cout << "\n=== Processing artwork " << artwork_id << " ===" << std::endl;
    
    // Check if already downloaded
    if (!args_.force_repeated && db_->is_downloaded(artwork_id)) {
        std::cout << "Skipping: Already downloaded (use -forceRepeated to override)" << std::endl;
        return true;
    }
    
    // Fetch artwork metadata
    std::cout << "Fetching artwork information..." << std::endl;
    std::string json_data;
    if (!http_client_->fetch_artwork_info(artwork_id, json_data)) {
        std::cerr << "Failed to fetch artwork info" << std::endl;
        return false;
    }
    
    // Parse image URLs
    auto image_urls = parse_image_urls(json_data, artwork_id);
    if (image_urls.empty()) {
        std::cerr << "No images found for this artwork" << std::endl;
        return false;
    }
    
    std::cout << "Found " << image_urls.size() << " image(s)" << std::endl;
    
    // Download each image
    bool all_success = true;
    for (size_t i = 0; i < image_urls.size(); ++i) {
        const auto& img_url = image_urls[i];
        
        // Extract filename from URL
        size_t last_slash = img_url.find_last_of('/');
        std::string filename = (last_slash != std::string::npos) 
                              ? img_url.substr(last_slash + 1) 
                              : artwork_id + "_" + std::to_string(i) + ".jpg";
        
        filename = sanitize_filename(filename);
        std::string output_path = args_.download_dir + "/" + filename;
        
        std::cout << "Downloading image " << (i + 1) << "/" << image_urls.size() 
                  << ": " << filename << std::endl;
        
        if (!http_client_->download_file(img_url, output_path)) {
            std::cerr << "Failed to download image " << (i + 1) << std::endl;
            all_success = false;
        } else {
            std::cout << "Saved: " << output_path << std::endl;
        }
    }
    
    // Mark as downloaded in database
    if (all_success) {
        std::string first_file = args_.download_dir + "/" + 
                                sanitize_filename(image_urls[0].substr(image_urls[0].find_last_of('/') + 1));
        db_->mark_downloaded(artwork_id, first_file);
        std::cout << "✓ Artwork " << artwork_id << " downloaded successfully" << std::endl;
    }
    
    return all_success;
}

int PixivDownloader::run() {
    std::cout << "Pixiv Artwork Downloader v1.0.0\n" << std::endl;
    
    // Validate input file
    if (args_.input_file.empty()) {
        std::cerr << "Error: No input file specified" << std::endl;
        ArgParser::print_help();
        return 1;
    }
    
    // Create download directory
    if (!ensure_directory_exists(args_.download_dir)) {
        return 1;
    }
    
    std::cout << "Download directory: " << args_.download_dir << std::endl;
    
    // Initialize database
    if (!db_->initialize()) {
        std::cerr << "Failed to initialize database" << std::endl;
        return 1;
    }
    
    int total_downloaded = db_->get_download_count();
    std::cout << "Database: " << total_downloaded << " artworks previously downloaded" << std::endl;
    
    // Load cookies
    std::cout << "Loading cookies from: " << args_.cookie_file << std::endl;
    if (!http_client_->set_cookies_from_file(args_.cookie_file)) {
        return 1;
    }
    
    // Read URLs from file
    std::cout << "Reading URLs from: " << args_.input_file << std::endl;
    auto urls = read_urls_from_file(args_.input_file);
    
    if (urls.empty()) {
        std::cerr << "No valid URLs found in input file" << std::endl;
        return 1;
    }
    
    std::cout << "Found " << urls.size() << " URL(s) to process\n" << std::endl;
    
    // Process each URL
    int success_count = 0;
    int skip_count = 0;
    int fail_count = 0;
    
    for (size_t i = 0; i < urls.size(); ++i) {
        std::cout << "\n[" << (i + 1) << "/" << urls.size() << "] ";
        
        std::string artwork_id = extract_artwork_id(urls[i]);
        if (artwork_id.empty()) {
            std::cerr << "Invalid URL: " << urls[i] << std::endl;
            fail_count++;
            continue;
        }
        
        if (!args_.force_repeated && db_->is_downloaded(artwork_id)) {
            std::cout << "Skipping artwork " << artwork_id << " (already downloaded)" << std::endl;
            skip_count++;
            continue;
        }
        
        if (download_artwork(artwork_id)) {
            success_count++;
        } else {
            fail_count++;
        }
        
        // Small delay between downloads to avoid rate limiting
        if (i < urls.size() - 1) {
            std::cout << "Waiting 2 seconds before next download..." << std::endl;
            #ifdef _WIN32
            Sleep(2000);
            #else
            sleep(2);
            #endif
        }
    }
    
    // Print summary
    std::cout << "\n=== Download Summary ===" << std::endl;
    std::cout << "Total URLs:       " << urls.size() << std::endl;
    std::cout << "Successfully downloaded: " << success_count << std::endl;
    std::cout << "Skipped:          " << skip_count << std::endl;
    std::cout << "Failed:           " << fail_count << std::endl;
    std::cout << "Database total:   " << db_->get_download_count() << std::endl;
    
    return (fail_count > 0) ? 1 : 0;
}
