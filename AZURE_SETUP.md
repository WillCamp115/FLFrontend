# Azure App Service Configuration for Next.js

## Important: Manual Azure Configuration Required

After deploying, you **must** configure the following settings in the Azure Portal:

## Your Azure Frontend URL

Your app will be available at: `https://freedomledger-frontend.azurewebsites.net` (or similar)

**IMPORTANT**: Add this URL to your backend CORS allowed origins!

### 1. Set Startup Command

1. Go to Azure Portal → Your App Service (freedomledger-frontend)
2. Navigate to **Configuration** → **General settings**
3. Set **Startup Command** to:
   ```bash
   node /home/site/wwwroot/node_modules/.bin/next start -p $PORT
   ```

   **Important:** Use the full path to avoid Azure's symlink issues.

### 2. Add Application Settings

In **Configuration** → **Application settings**, add:

- `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false`
- `WEBSITE_NODE_DEFAULT_VERSION` = `22.x`
- `PORT` = `8080` (if not automatically set)

### 3. Disable Oryx Build (Optional but Recommended)

In **Configuration** → **Application settings**, add:
- `ENABLE_ORYX_BUILD` = `false`

## Why These Changes?

The original issue was that Azure was trying to:
1. Extract a cached `node_modules.tar.gz`
2. Run `npm run build` on startup (not during deployment)
3. This failed because the `next` command wasn't in the PATH

The solution:
- The GitHub Actions workflow now **builds the app during CI/CD**
- Azure should **skip the build** and just **run the pre-built app**
- The startup command tells Azure to run `npm start` (not `npm build`)

## Deployment Flow

```
GitHub Push → GitHub Actions → npm install → npm build → zip →
  → Deploy to Azure → Unzip → Run startup command (npm start)
```

## Troubleshooting

If you still see "next: not found":
1. Check that `SCM_DO_BUILD_DURING_DEPLOYMENT=false` is set
2. Verify the startup command is configured
3. Check deployment logs to ensure the `.next` folder exists
4. Ensure `node_modules` is included in the deployment package

## Alternative: Use Azure CLI

You can set these via Azure CLI:

```bash
az webapp config set --resource-group <your-resource-group> \
  --name freedomledger-frontend \
  --startup-file "npm run start"

az webapp config appsettings set --resource-group <your-resource-group> \
  --name freedomledger-frontend \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false \
             ENABLE_ORYX_BUILD=false \
             WEBSITE_NODE_DEFAULT_VERSION=22.x
```
