# BillSpliter 🧾

A Progressive Web App (PWA) to scan, split, and manage bills with friends using AI-powered receipt analysis. Built with a hand-drawn paper theme for a delightful user experience.

## Features

- 📸 **AI-Powered Receipt Scanning** - Uses Google Gemini AI to extract bill items automatically
- 👥 **Smart Bill Splitting** - Assign items to multiple people with ease
- 💰 **Automatic Calculations** - Handles taxes, service charges, and discounts
- 📱 **PWA Ready** - Works offline and can be installed on mobile devices
- 🎨 **Beautiful UI** - Hand-drawn paper theme with smooth animations

## Tech Stack

- Vanilla JavaScript (ES6+)
- Google Gemini 2.5 Flash-Lite API
- Decimal.js for precise financial calculations
- Vercel Serverless Functions (for API key security)

## Local Development

### Prerequisites

- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- A local web server (VS Code Live Server, Python http.server, etc.)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Split_Bill_Working
   ```

2. **Set up environment variables for local development**
   ```bash
   cp env.js.example env.js
   ```
   Then edit `env.js` and add your API key:
   ```javascript
   window.GEMINI_API_KEY = "YOUR_ACTUAL_API_KEY_HERE";
   ```

3. **Start a local server**
   - **VS Code**: Use Live Server extension (usually runs on port 5500)
   - **Python**: `python -m http.server 8000`
   - **Node.js**: `npx serve .`

4. **Open in browser**
   - Navigate to `http://localhost:5500` (or your server's port)

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variable**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add `GEMINI_API_KEY` with your API key value
   - Redeploy for changes to take effect

### Option 2: Deploy via GitHub

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the configuration

3. **Set Environment Variable**
   - In project settings, add `GEMINI_API_KEY`
   - Redeploy

## Project Structure

```
├── api/
│   └── gemini.js          # Serverless function for Gemini API (keeps API key secure)
├── index.html            # Main HTML file
├── main.js               # Application logic
├── style.css             # Styles with hand-drawn paper theme
├── env.js                # Local development API key (gitignored)
├── env.js.example        # Template for env.js
├── vercel.json           # Vercel configuration
└── README.md             # This file
```

## How It Works

1. **Scan/Upload**: User takes a photo or uploads a receipt image
2. **AI Analysis**: Image is sent to Gemini API which extracts:
   - Item names, rates, and prices
   - Subtotal, tax, service charge, discounts, and total
3. **Review**: User can review and edit the extracted data
4. **Assign People**: Add names of people splitting the bill
5. **Assign Items**: Go through each item and assign to people
6. **Calculate**: Automatic calculation of each person's share
7. **Share**: Generate and share the final split summary

## API Key Security

- **Production (Vercel)**: API key is stored as an environment variable and used server-side
- **Local Development**: API key is in `env.js` (gitignored) for direct client-side calls

The app automatically detects if the serverless endpoint is available and falls back to direct API calls for local development.

## License

Built with ❤️ by [Om Kharche](https://omkharche.com)

