# NEXT-STEPS — finish the template setup

Run these in order when you sit at your Mac. Total time should be ~5 minutes.
Steps 1 and 2 open browsers for OAuth; the rest are non-interactive.

> Replace `<your-username>` with your GitHub username everywhere it appears below.

---

## 1. Authenticate the CLIs

```bash
gh auth login
#   - GitHub.com
#   - HTTPS
#   - Authenticate with browser (paste the one-time code)

railway login
#   - Opens a browser; click "Authorize"
```

## 2. Push the template repo to GitHub

```bash
cd ~/Code/s3-prototype-template

gh repo create s3-prototype-template \
  --source=. \
  --public \
  --push \
  --description "S3 prototype template: Django + React + Postgres + Railway"
```

## 3. Mark the repo as a GitHub template

```bash
gh api -X PATCH repos/<your-username>/s3-prototype-template -f is_template=true
```

## 4. End-to-end test — spin up a throwaway from the template

```bash
cd ~/Code

gh repo create s3-test-prototype \
  --template <your-username>/s3-prototype-template \
  --clone \
  --public

cd s3-test-prototype

railway init     # name it: s3-test-prototype
railway add      # choose: Postgres
railway up       # deploys; watch the build logs
railway domain   # generates a *.up.railway.app URL
```

Open the printed URL. If the React shell loads and `/example` renders, the
recipe works end-to-end.

---

## 5. If anything fails

Most likely failure modes and where to look:

- **Build fails on `uv sync`:** `uv` not in Railway's Nixpacks default. Either
  install it via a `nixpacks.toml` or switch the build command to use `pip`
  against the lockfile.
- **`collectstatic` fails:** `frontend/dist/` must exist before
  `collectstatic` runs. The `railway.toml` build command runs `npm run build`
  first; verify the order didn't get edited.
- **Django boots but `/` 404s:** the SPA template path resolves from
  `frontend/dist/index.html`. Confirm Vite actually wrote that file by
  checking the build logs.
- **DB connection refused:** the Postgres plugin must be linked to the same
  Railway project as the web service. `railway add` does this automatically;
  if you ran it from the wrong directory it landed somewhere else.

---

## 6. Clean up the test prototype

Once the end-to-end works:

```bash
# Local
rm -rf ~/Code/s3-test-prototype

# GitHub
gh repo delete <your-username>/s3-test-prototype --yes

# Railway
railway down   # from inside ~/Code/s3-test-prototype before you rm it,
               # OR delete the project from the Railway dashboard
```

Then update `_context/s3-new-app-playbook.md` with anything that surprised you.
