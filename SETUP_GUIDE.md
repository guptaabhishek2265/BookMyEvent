# Complete Setup Guide: MongoDB Atlas & Application Configuration

This guide will walk you through exactly how to set up your backend dependencies, including MongoDB Atlas (the remote cloud database), followed by starting up the application.

---

## Step 1: Set Up MongoDB Atlas (Your Database)

MongoDB Atlas provides a fully managed, free cloud database. This is where `mongoose` will store all your `Users`, `Events`, and `Bookings`.

1. **Sign Up / Log In**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. **Create a Cluster**:
   - Once logged in, click **"Build a Database"** or **"Create Cluster"**.
   - Select the **"M0 Sandbox" (Free Tier)** option.
   - Choose a provider (e.g., AWS, Google Cloud) and click **Create** (no credit card required).
3. **Set Up Database Access (Credentials)**:
   - On the left sidebar, click **"Database Access"**.
   - Click **"Add New Database User"**.
   - Choose **Password** authentication.
   - Set a Username (e.g., `eventoradmin`) and a Password (e.g., `eventorapassword`). **Remember these.**
   - Click **Add User**.
4. **Set Up Network Access (IP Whitelist)**:
   - On the left sidebar, click **"Network Access"**.
   - Click **"Add IP Address"**.
   - Choose **"Allow Access from Anywhere"** (this sets the IP to `0.0.0.0/0`) so that your local machine (and later, Vercel/Render) can connect to it.
   - Click **Confirm**.
5. **Get Your Connection String**:
   - On the left sidebar, click **"Database"** (under Deployments).
   - Click the **"Connect"** button on your new cluster.
   - Choose **"Drivers"** (Connect your application).
   - Copy the connection string provided by Atlas.
   - **Important**: Replace the password placeholder in Atlas with the actual password you created in Step 3, but keep the final value only in `server/.env`. Do not commit the completed URI to Git.

---

## Step 2: Set Up Gmail App Passwords (For Nodemailer)

To send emails automatically (booking confirmations), you need to configure an App Password for your Gmail account. Normal passwords won't work because of 2FA.

1. Go to your [Google Account Manage page](https://myaccount.google.com/).
2. Navigate to the **Security** tab on the left.
3. Under "How you sign in to Google", select **2-Step Verification** and make sure it is turned ON.
4. Once ON, go back to the Security tab, search for **App Passwords** in the search bar.
5. Generate a new App Password (select "Other" and name it "Eventora").
6. Copy the 16-character password generated.

---

## Step 3: Configure the Environment Variables (`.env`)

Now that you have your credentials, you need to plug them into the backend. Open the file located at `server/.env` and paste your values:

```env
# Paste your MongoDB Atlas URI here. Keep the completed URI private.
MONGO_URI=your_mongodb_atlas_connection_string

# Generate a long random value for this and keep it private.
JWT_SECRET=generate_a_secure_random_jwt_secret

# Email Setup Configured using Step 2
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=the_16_character_app_password
GOOGLE_CLIENT_ID=your_google_oauth_client_id
CLIENT_URL=http://localhost:5173

PORT=5000
```

Then open `client/.env` and add the matching browser config:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

For Google sign-in, add your local frontend origin, usually `http://localhost:5173`, in the Google Cloud OAuth Client's authorized JavaScript origins. Add your production frontend URL there too when you deploy.

When you deploy, update your hosting environment variables instead of editing code:

```env
# Backend hosting
GOOGLE_CLIENT_ID=your_google_oauth_client_id
CLIENT_URL=https://your-frontend-domain.com

# Frontend hosting
VITE_API_URL=https://your-backend-domain.com/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

In Google Cloud Console, add both origins to the OAuth Client:

```text
http://localhost:5173
https://your-frontend-domain.com
```

---

## Step 4: Run the Application!

### Start the Backend
Open a terminal inside the `/server` folder:
```bash
cd server
npm run dev
```
If you configured your `MONGO_URI` correctly, the terminal will say:
> `Server running on port 5000`
> `MongoDB Connected`


### Start the Frontend
Open a new terminal inside the `/client` folder:
```bash
cd client
npm run dev
```
It will provide a local URL (e.g., `http://localhost:5173/`). Open this in your browser.

---

## Step 5: Test the API with Postman

I have included an export file named `Eventora_Postman_Collection.json` in the root of the project. This contains every API route pre-configured.

1. Open [Postman](https://www.postman.com/downloads/).
2. Click **Import** (top left).
3. Drag and drop the `Eventora_Postman_Collection.json` file into the window.
4. The collection will act as an end-to-end script utilizing environment variables:
   - Run the **Register User** request, then trigger **Verify Account OTP**, to activate your first admin/user account.
   - Run the **Login** request. (This will automatically save your auth token into Postman).
   - Run **Create Event (Admin)**. This will automatically save the `event_id`.
   - Run **Send Booking OTP Request** to trigger an OTP code email to yourself.
   - Run **Verify & Request Booking** (using your emailed OTP) to put your ticket request in the 'Pending' queue. This will save your `booking_id`.
   - Run **Confirm Booking (Admin - Paid)** to finalize the order, deduct a seat, and trigger a confirmation email.
   - Or test **Cancel/Reject Booking (Admin/User)**.

You're done! The full user to admin pipeline is ready to be tested both on the frontend React App and in Postman.
