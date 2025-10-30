#include "arg_parser.h"
#include <iostream>
#include <cstring>

ProgramArgs ArgParser::parse(int argc, char* argv[]) {
    ProgramArgs args;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "-h" || arg == "--help") {
            args.show_help = true;
        }
        else if (arg == "-v" || arg == "--version") {
            args.show_version = true;
        }
        else if (arg == "-forceRepeated" || arg == "--forceRepeated") {
            args.force_repeated = true;
        }
        else if (arg == "-d" || arg == "--download-dir") {
            if (i + 1 < argc) {
                args.download_dir = argv[++i];
            } else {
                std::cerr << "Error: " << arg << " requires an argument" << std::endl;
                args.show_help = true;
            }
        }
        else if (arg == "-c" || arg == "--cookie-file") {
            if (i + 1 < argc) {
                args.cookie_file = argv[++i];
            } else {
                std::cerr << "Error: " << arg << " requires an argument" << std::endl;
                args.show_help = true;
            }
        }
        else if (arg == "-i" || arg == "--input") {
            if (i + 1 < argc) {
                args.input_file = argv[++i];
            } else {
                std::cerr << "Error: " << arg << " requires an argument" << std::endl;
                args.show_help = true;
            }
        }
        else if (arg[0] != '-' && args.input_file.empty()) {
            // Positional argument - input file
            args.input_file = arg;
        }
        else {
            std::cerr << "Unknown option: " << arg << std::endl;
            args.show_help = true;
        }
    }

    return args;
}

void ArgParser::print_help() {
    std::cout << "Pixiv Artwork Downloader\n"
              << "Usage: pixiv_downloader [options] <input_file>\n\n"
              << "Arguments:\n"
              << "  input_file              File containing Pixiv artwork URLs (one per line)\n\n"
              << "Options:\n"
              << "  -h, --help              Show this help message\n"
              << "  -v, --version           Show version information\n"
              << "  -d, --download-dir DIR  Download directory (default: ./downloads)\n"
              << "  -c, --cookie-file FILE  Cookie file path (default: ../cookie)\n"
              << "  -forceRepeated          Re-download already downloaded artworks\n\n"
              << "Examples:\n"
              << "  pixiv_downloader urls.txt\n"
              << "  pixiv_downloader -d ./my_downloads urls.txt\n"
              << "  pixiv_downloader -forceRepeated -d ./downloads urls.txt\n\n"
              << "The input file should contain one Pixiv artwork URL per line:\n"
              << "  https://www.pixiv.net/artworks/123456\n"
              << "  https://www.pixiv.net/artworks/789012\n\n"
              << "Cookie file should be in the same format as bookmark-url-extractor.js uses.\n";
}

void ArgParser::print_version() {
    std::cout << "Pixiv Artwork Downloader v1.0.0\n"
              << "Copyright (c) 2025\n";
}
