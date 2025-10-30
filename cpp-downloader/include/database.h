#pragma once

#include <string>
#include <memory>

struct sqlite3;

class Database {
public:
    Database(const std::string& db_path);
    ~Database();

    // Initialize database schema
    bool initialize();

    // Check if artwork is already downloaded
    bool is_downloaded(const std::string& artwork_id);

    // Mark artwork as downloaded
    bool mark_downloaded(const std::string& artwork_id, const std::string& file_path);

    // Get total downloaded count
    int get_download_count();

private:
    sqlite3* db_;
    std::string db_path_;
};
