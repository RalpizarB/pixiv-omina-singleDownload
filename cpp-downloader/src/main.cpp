#include "pixiv_downloader.h"
#include "arg_parser.h"
#include <iostream>

int main(int argc, char* argv[]) {
    // Parse command line arguments
    ProgramArgs args = ArgParser::parse(argc, argv);

    // Handle help/version flags
    if (args.show_help) {
        ArgParser::print_help();
        return 0;
    }

    if (args.show_version) {
        ArgParser::print_version();
        return 0;
    }

    try {
        // Create and run downloader
        PixivDownloader downloader(args);
        return downloader.run();
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
}
