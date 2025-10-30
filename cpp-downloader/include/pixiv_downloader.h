#pragma once

#include <string>
#include <memory>
#include "database.h"
#include "http_client.h"
#include "arg_parser.h"

class PixivDownloader {
public:
    PixivDownloader(const ProgramArgs& args);
    ~PixivDownloader();

    // Run the downloader
    int run();

private:
    ProgramArgs args_;
    std::unique_ptr<Database> db_;
    std::unique_ptr<HttpClient> http_client_;

    // Read URLs from input file
    std::vector<std::string> read_urls_from_file(const std::string& file_path);

    // Extract artwork ID from URL
    std::string extract_artwork_id(const std::string& url);

    // Download single artwork
    bool download_artwork(const std::string& artwork_id);

    // Parse artwork JSON and extract image URLs
    std::vector<std::string> parse_image_urls(const std::string& json_data, const std::string& artwork_id);

    // Create download directory if it doesn't exist
    bool ensure_directory_exists(const std::string& path);

    // Generate safe filename
    std::string sanitize_filename(const std::string& filename);
};
