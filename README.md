# Recipe Graph

This is a simple recipe app you can keep on your own computer.

The special thing about it is that one recipe can be used inside another recipe.

Example:

- You can save `Bechamel Sauce` once.
- Then when you make `Lasagne`, you can link that sauce into the lasagne recipe.
- That means you do not have to type the same sauce recipe again and again.

This guide is written for someone who is not technical.

## What You Need First

You need these things on your computer:

1. Windows
2. Internet access
3. [Node.js](https://nodejs.org/)
4. The files for this project from GitHub

If Node.js is not already installed:

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the `LTS` version
3. Run the installer
4. Keep clicking `Next`
5. Restart the computer if it asks you to

## How To Get The Files From GitHub

There are 2 easy ways.

### Option 1: The easiest way

1. Open the GitHub page for this project in your web browser.
2. Click the green `Code` button.
3. Click `Download ZIP`.
4. Find the ZIP file in `Downloads`.
5. Right-click it and choose `Extract All`.
6. Pick a folder you will remember, for example:
   `Documents\Recipe Graph`

This is the easiest method if you do not care about learning Git.

### Option 2: Using GitHub Desktop

If someone has already installed GitHub Desktop for you:

1. Open GitHub Desktop
2. Click `File`
3. Click `Clone repository`
4. Paste the GitHub link for this project
5. Choose where to save it on your computer
6. Click `Clone`

## How To Open The Project Folder

After you have downloaded or cloned the files:

1. Open the folder on your computer
2. Click in the folder address bar at the top
3. Type `powershell`
4. Press `Enter`

That opens the terminal in the correct folder.

You can also use `Command Prompt` or `Windows Terminal` if you prefer.

Important:

This app is inside the `recipe-db` folder, not the folder above it.

So if your files are here:

`C:\Users\YourName\CascadeProjects\codex-27032026\recipe-db`

Then PowerShell must be opened in the `recipe-db` folder itself.

The PowerShell line should end like this before you run any `npm` command:

```powershell
PS C:\Users\YourName\CascadeProjects\codex-27032026\recipe-db>
```

If it only ends at:

```powershell
PS C:\Users\YourName\CascadeProjects\codex-27032026>
```

then you are still one folder too high.

If that happens, type:

```powershell
cd .\recipe-db
```

or use the full path:

```powershell
cd C:\Users\YourName\CascadeProjects\codex-27032026\recipe-db
```

## First-Time Setup

You only need to do this once.

Type these commands one at a time and press `Enter` after each one:

```powershell
cd C:\Users\YourName\CascadeProjects\codex-27032026\recipe-db
npm install
npm run db:setup
```

What these do:

- `npm install` downloads the parts the app needs
- `npm run db:setup` creates the local recipe database on your computer

## Optional: Add Example Recipes

If you want the app to start with example recipes already in it, run this too:

```powershell
npm run db:seed
```

That adds:

- Bechamel Sauce
- Ragu
- Lasagne

This is useful because it shows how one recipe can point to another recipe.

## How To Start The App

Whenever you want to use it, open PowerShell in the project folder and run:

```powershell
cd C:\Users\YourName\CascadeProjects\codex-27032026\recipe-db
npm run dev
```

After a few seconds, open this address in your web browser:

[http://localhost:3000](http://localhost:3000)

Leave the PowerShell window open while you are using the app.

If you close that window, the app stops running.

## How To Use The App

When the page opens:

1. Fill in the recipe name
2. Add a short summary if you want
3. Add servings, prep time, and cook time if you want
4. Type the instructions
5. Add ingredient rows

For each ingredient row, you can either:

- Type a normal ingredient like `Milk` or `Butter`
- Or choose a saved recipe from the `Linked Recipe` box

That is how you make a “recipe inside a recipe”.

Example:

1. Save `Bechamel Sauce`
2. Save `Ragu`
3. Make a new recipe called `Lasagne`
4. In the `Lasagne` recipe, add a row linked to `Bechamel Sauce`
5. Add another row linked to `Ragu`

Now lasagne is built from smaller recipes.

## Where Your Data Lives

Your recipes are stored on your computer in this file:

`data\recipes.db`

That means:

- Your recipes stay on your machine
- You can back up the whole project folder if you want
- If you move the folder to another computer, copy the `data` folder too

## How To Stop The App

Go back to the PowerShell window and press:

```powershell
Ctrl + C
```

Then press `Y` and `Enter` if it asks.

## If Something Goes Wrong

### If `npm` is not recognised

That usually means Node.js is not installed, or the computer needs restarting after installation.

### If `npm install` says it cannot find `package.json`

You are almost certainly in the wrong folder.

Move into the `recipe-db` folder first:

```powershell
cd C:\Users\YourName\CascadeProjects\codex-27032026\recipe-db
```

Then run:

```powershell
npm install
```

### If the browser page does not open

Try typing this into your browser yourself:

[http://localhost:3000](http://localhost:3000)

### If the app says the port is already being used

That usually means another copy is already running.
Close the other terminal window, or stop it with `Ctrl + C`, then try again.

### If you want a completely fresh database

Close the app, then delete this file:

`data\recipes.db`

After that, run:

```powershell
npm run db:setup
```

And if you want the example recipes back:

```powershell
npm run db:seed
```

## Commands Summary

These are the only commands most people will need:

```powershell
npm install
npm run db:setup
npm run db:seed
npm run dev
```

## What This Project Uses

- Next.js
- React
- SQLite
- Node.js

You do not need to learn those to use the app.

## License
This software is currently not licensed for commercial use. If you’d like to use this in a business setting or install it professionally, please contact me at cw4444@gmail.com
