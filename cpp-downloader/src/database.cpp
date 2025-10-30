#include "database.h"
#include <sqlite3.h>
#include <iostream>

Database::Database(const std::string& db_path)
    : db_(nullptr), db_path_(db_path) {
}

Database::~Database() {
    if (db_) {
        sqlite3_close(db_);
    }
}

bool Database::initialize() {
    int rc = sqlite3_open(db_path_.c_str(), &db_);
    if (rc != SQLITE_OK) {
        std::cerr << "Cannot open database: " << sqlite3_errmsg(db_) << std::endl;
        return false;
    }

    // Create table if it doesn't exist
    const char* sql = R"(
        CREATE TABLE IF NOT EXISTS downloaded_artworks (
            artwork_id TEXT PRIMARY KEY,
            file_path TEXT NOT NULL,
            download_time DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_artwork_id ON downloaded_artworks(artwork_id);
    )";

    char* err_msg = nullptr;
    rc = sqlite3_exec(db_, sql, nullptr, nullptr, &err_msg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << err_msg << std::endl;
        sqlite3_free(err_msg);
        return false;
    }

    return true;
}

bool Database::is_downloaded(const std::string& artwork_id) {
    const char* sql = "SELECT COUNT(*) FROM downloaded_artworks WHERE artwork_id = ?";
    sqlite3_stmt* stmt;

    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg(db_) << std::endl;
        return false;
    }

    sqlite3_bind_text(stmt, 1, artwork_id.c_str(), -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    int count = 0;
    if (rc == SQLITE_ROW) {
        count = sqlite3_column_int(stmt, 0);
    }

    sqlite3_finalize(stmt);
    return count > 0;
}

bool Database::mark_downloaded(const std::string& artwork_id, const std::string& file_path) {
    const char* sql = "INSERT OR REPLACE INTO downloaded_artworks (artwork_id, file_path) VALUES (?, ?)";
    sqlite3_stmt* stmt;

    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg(db_) << std::endl;
        return false;
    }

    sqlite3_bind_text(stmt, 1, artwork_id.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, file_path.c_str(), -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    if (rc != SQLITE_DONE) {
        std::cerr << "Failed to insert record: " << sqlite3_errmsg(db_) << std::endl;
        return false;
    }

    return true;
}

int Database::get_download_count() {
    const char* sql = "SELECT COUNT(*) FROM downloaded_artworks";
    sqlite3_stmt* stmt;

    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        return 0;
    }

    rc = sqlite3_step(stmt);
    int count = 0;
    if (rc == SQLITE_ROW) {
        count = sqlite3_column_int(stmt, 0);
    }

    sqlite3_finalize(stmt);
    return count;
}
