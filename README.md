# Markdown + Mermaid Renderer

A lightweight, local Markdown and Mermaid diagram renderer with PDF export capability. No logins, no payments, completely free and open source.

## Features

- ✨ **Real-time Markdown rendering** - See your changes instantly
- 🎨 **37 Professional Themes** - Beautiful styles from Marked2 collection (Academia default)
- 📊 **Mermaid diagram support** - Flowcharts, sequence diagrams, class diagrams, and more
- 📄 **PDF export** - Generate professional PDFs with one click
- 📁 **Drag and drop** - Drop .md files directly into the editor to load them
- 💾 **Auto-save** - Your work is automatically saved to browser localStorage
- 🖥️ **Clean interface** - Split-pane editor with syntax highlighting
- ⚡ **Fast & lightweight** - Runs entirely in your browser
- 🔒 **Privacy-focused** - Everything runs locally, no data sent anywhere

## Quick Start

### Option 1: Docker (Recommended - Most Portable)

**Using Docker Compose (easiest):**
```bash
docker-compose up -d
```

Then open http://localhost:8080 in your browser.

**Using Docker CLI:**
```bash
# Build the image
docker build -t markdown-mermaid-renderer:latest .

# Run the container
docker run -d -p 8080:80 --name markdown-renderer markdown-mermaid-renderer:latest
```

**Using npm scripts:**
```bash
# With Docker Compose
npm run docker:compose:up

# Or with Docker CLI
npm run docker:build
npm run docker:run
```

**Stopping the container:**
```bash
docker-compose down
# or
npm run docker:compose:down
```

### Option 2: Open directly in browser

Simply open `index.html` in your web browser. That's it!

```bash
open index.html
```

### Option 3: Run with local server

```bash
npm install
npm start
```

This will start a local server at http://localhost:8080 and open it in your browser.

### Option 4: Use Python's built-in server

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Usage

1. **Edit** - Type or paste your Markdown in the left panel
2. **Choose a style** - Select from 37 professional themes in the dropdown (Academia is default)
3. **Load files** - Drag and drop any .md, .markdown, or .txt file into the editor to load it
4. **Preview** - See the rendered output in real-time on the right
5. **Export to PDF** - Two options:
   - Click "Print/PDF" - Opens browser's print dialog (choose "Save as PDF")
   - Click "Print (New Tab)" - Opens content in new tab for printing/saving
6. **Sample** - Click "Load Sample" to see examples of Markdown and Mermaid

### Keyboard Shortcuts

- `Cmd/Ctrl + S` - Show save status (auto-saved automatically)
- `Cmd/Ctrl + P` - Open print dialog (save as PDF)
- `Cmd/Ctrl + Shift + P` - Open in new tab for printing

### Professional Themes

Choose from 37 beautiful styles from the [Marked2 Custom Styles](https://github.com/ttscoff/MarkedCustomStyles) collection:

**Academic Styles:** Academia (default), Academic, Academic CV, Chicago Academic, Juridico
**Professional:** Brett Terpstra, Simplex, Resolute, Meeting Minutes
**Creative:** Amelia, Emma, Ulysses, Yeti, and many more

Your style choice is automatically saved. See **STYLES.md** for the complete gallery and details.

## Mermaid Diagram Examples

### Flowchart

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob!
    Bob->>Alice: Hello Alice!
\`\`\`

### Class Diagram

\`\`\`mermaid
classDiagram
    Animal <|-- Dog
    Animal <|-- Cat
\`\`\`

### Gantt Chart

\`\`\`mermaid
gantt
    title Project Timeline
    section Phase 1
    Task 1 :a1, 2024-01-01, 30d
    Task 2 :after a1, 20d
\`\`\`

### Entity Relationship

\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
\`\`\`

## Libraries Used

- [Marked.js](https://marked.js.org/) - Fast Markdown parser (MIT License)
- [Mermaid.js](https://mermaid.js.org/) - Diagram generation (MIT License)
- Native browser print functionality - PDF generation (no external dependencies)

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Tips

- Your content is automatically saved in browser localStorage
- The PDF export works best in Chrome/Edge
- For best results, use code blocks with the `mermaid` language identifier
- You can edit the HTML file to customize colors, fonts, and styling

## License

MIT License - Feel free to use, modify, and distribute.

## Troubleshooting

**Diagrams not rendering?**
- Make sure you're using the `mermaid` language identifier in code blocks
- Check browser console for errors

**PDF export not working?**
- Use a modern browser (Chrome/Edge recommended)
- Try running with a local server instead of opening the file directly

**Content not saving?**
- Make sure browser localStorage is enabled
- Check that you're not in private/incognito mode

## Docker Deployment

### Container Details

- **Base Image:** nginx:alpine (lightweight, ~25MB)
- **Port:** 80 (mapped to host port 8080)
- **Health Check:** Included for monitoring
- **Auto-restart:** Enabled (unless manually stopped)

### Available npm Scripts

```bash
# Docker Compose commands
npm run docker:compose:up      # Start container with docker-compose
npm run docker:compose:down    # Stop and remove container
npm run docker:compose:logs    # View container logs

# Docker CLI commands
npm run docker:build           # Build the Docker image
npm run docker:run             # Run the container
npm run docker:stop            # Stop and remove the container
npm run docker:logs            # View container logs
```

### Moving to Another Computer

1. **Save the image:**
```bash
docker save markdown-mermaid-renderer:latest | gzip > markdown-renderer.tar.gz
```

2. **Copy the file** to your other computer (USB drive, network, etc.)

3. **Load on the new computer:**
```bash
gunzip -c markdown-renderer.tar.gz | docker load
```

4. **Run it:**
```bash
docker run -d -p 8080:80 --name markdown-renderer markdown-mermaid-renderer:latest
```

### Alternative: Push to Docker Hub (Optional)

```bash
# Tag the image
docker tag markdown-mermaid-renderer:latest yourusername/markdown-renderer:latest

# Push to Docker Hub
docker push yourusername/markdown-renderer:latest

# Pull on another computer
docker pull yourusername/markdown-renderer:latest
docker run -d -p 8080:80 --name markdown-renderer yourusername/markdown-renderer:latest
```

### Customization

To customize the port, edit `docker-compose.yml`:
```yaml
ports:
  - "3000:80"  # Change 8080 to your preferred port
```

Or with Docker CLI:
```bash
docker run -d -p 3000:80 --name markdown-renderer markdown-mermaid-renderer:latest
```

## Contributing

This is a simple, self-contained project. Feel free to fork and customize for your needs!
