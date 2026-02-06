# Welcome to AeroRead

## Project info

**URL**: https://aeroread.vercel.app

## How can I edit this code?

There are several ways of editing your application.

**Use the Aero Engine**

Simply visit the AeroRead interface and start reading. 

Changes made to the text processor or engine logic will be reflected across all narrative data streams.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The requirement is having Node.js & npm installed for the frontend, and Python 3.10+ for the backend.

Follow these steps:

```sh
# Step 1: Clone the repository.
git clone <YOUR_GIT_URL>

# Step 2: Setup the Frontend.
cd frontend
npm i
npm run dev

# Step 3: Setup the Backend.
cd ../backend
pip install -r requirements.txt
python main.py