#pragma once

#include <string>
#include <vector>

struct ProgramArgs {
    std::string input_file;
    std::string download_dir = "./downloads";
    std::string cookie_file = "../cookie";
    bool force_repeated = false;
    bool show_help = false;
    bool show_version = false;
};

class ArgParser {
public:
    static ProgramArgs parse(int argc, char* argv[]);
    static void print_help();
    static void print_version();
};
