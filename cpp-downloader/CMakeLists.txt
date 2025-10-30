cmake_minimum_required(VERSION 3.15)
project(pixiv_downloader VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set output directory for Windows
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Add vcpkg toolchain if available
if(DEFINED ENV{VCPKG_ROOT})
    set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "")
endif()

# Find required packages
find_package(CURL REQUIRED)
find_package(unofficial-sqlite3 CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

# Source files
set(SOURCES
    src/main.cpp
    src/pixiv_downloader.cpp
    src/database.cpp
    src/http_client.cpp
    src/arg_parser.cpp
)

set(HEADERS
    include/pixiv_downloader.h
    include/database.h
    include/http_client.h
    include/arg_parser.h
)

# Create executable
add_executable(pixiv_downloader ${SOURCES} ${HEADERS})

# Include directories
target_include_directories(pixiv_downloader PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Link libraries
target_link_libraries(pixiv_downloader PRIVATE
    CURL::libcurl
    unofficial::sqlite3::sqlite3
    nlohmann_json::nlohmann_json
)

# Windows-specific settings
if(WIN32)
    target_link_libraries(pixiv_downloader PRIVATE ws2_32 crypt32)
    # Set console subsystem for Windows
    if(MSVC)
        set_target_properties(pixiv_downloader PROPERTIES
            WIN32_EXECUTABLE FALSE
        )
    endif()
endif()

# Install target
install(TARGETS pixiv_downloader
    RUNTIME DESTINATION bin
)

# Copy README
install(FILES ${CMAKE_CURRENT_SOURCE_DIR}/README.md
    DESTINATION .
)
