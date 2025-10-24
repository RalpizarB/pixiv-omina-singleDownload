# Release Process

This document describes how to create releases for Pixiv Omina.

## Build Configuration

The project is configured to build the following Windows packages:
- **NSIS Installer (ia32)**: Traditional Windows installer for 32-bit systems
- **NSIS Installer (x64)**: Traditional Windows installer for 64-bit systems
- **Portable ZIP (ia32)**: Portable version for 32-bit systems (no installation required)
- **Portable ZIP (x64)**: Portable version for 64-bit systems (no installation required)

## Automated Release via GitHub Actions

The project includes a GitHub Actions workflow that automatically builds and creates releases.

### Triggering a Release

1. **Tag-based Release** (Recommended):
   ```bash
   git tag -a v0.9.2 -m "Release version 0.9.2"
   git push origin v0.9.2
   ```
   This will automatically:
   - Build all Windows packages
   - Create a GitHub release
   - Upload all build artifacts to the release
   - Generate release notes

2. **Manual Trigger**:
   - Go to the "Actions" tab in GitHub
   - Select "Build and Release" workflow
   - Click "Run workflow"
   - Choose the branch to build from

### Release Artifacts

After a successful build, the following files will be available in the GitHub release:
- `Pixiv Omina Setup <version>.exe` - 32-bit installer
- `Pixiv Omina Setup <version>.exe` - 64-bit installer  
- `Pixiv Omina-<version>-win.zip` - 32-bit portable
- `Pixiv Omina-<version>-win.zip` - 64-bit portable

Note: The exact naming convention may vary based on electron-builder configuration. Check the `dist/` directory after building to see the actual filenames.

## Manual Build (Local Development)

If you need to build packages locally:

### Prerequisites
- Node.js 16 or higher
- Yarn package manager
- Python 3.11 (for native dependencies)
- Windows OS (for Windows builds)

### Build Steps

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Build all Windows packages**:
   ```bash
   yarn dist
   ```
   
   The built packages will be in the `dist/` directory.

3. **Build without publishing** (for testing):
   ```bash
   yarn dist:dir
   ```
   This creates unpacked distributions for quick testing.

### Build Options

To build specific targets, you can modify the `package.json` or use electron-builder CLI:

```bash
# Build only 64-bit packages
yarn compile && electron-builder --win --x64

# Build only portable zip
yarn compile && electron-builder --win --x64 zip

# Build only installer
yarn compile && electron-builder --win --x64 nsis
```

## Version Management

Before creating a release:

1. Update the version in `package.json`:
   ```json
   {
     "version": "0.9.2"
   }
   ```

2. Update the `CHANGELOG.md` (if exists) with release notes

3. Commit the version change:
   ```bash
   git add package.json
   git commit -m "Bump version to 0.9.2"
   git push
   ```

4. Create and push the tag (as described above)

## Troubleshooting

### Build Fails on GitHub Actions

- Check the Actions logs for specific error messages
- Ensure all dependencies are properly declared in `package.json`
- Verify that the build works locally first

### Missing Artifacts

- Verify the `dist/` directory is excluded from `.gitignore`
- Check that electron-builder successfully created the packages
- Review workflow artifact upload configuration

### Protocol Registration Issues

If the custom protocol (`pixiv-omina://`) doesn't register:
- Try running the installer as Administrator
- See issue #27 for known workarounds
- The portable version won't register protocols automatically

## Notes

- The GitHub Actions workflow requires the `GITHUB_TOKEN` secret, which is automatically provided by GitHub
- Build artifacts are retained for 7 days in the workflow runs
- The portable ZIP versions are ideal for users who don't have admin rights or prefer not to install software
- NSIS installers support custom installation directories and per-machine installation
