AURA LABIB — Facebook Video Downloader

Owner: Labib Islam

IMPORTANT SECURITY
Do NOT put the RapidAPI key inside public/index.html, GitHub code, or any public JavaScript.
The key must be stored only in Render -> Environment Variables as:
RAPIDAPI_KEY

DEPLOY
1. Upload these files to the GitHub repository.
2. In Render, open the Web Service.
3. Environment -> add RAPIDAPI_KEY with your new RapidAPI key.
4. Deploy the latest commit.
5. Open the live URL and test with a public Facebook video/Reel URL.

The frontend calls /api/download. The server calls RapidAPI securely.
