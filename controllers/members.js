const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
const membersRouter = require('express').Router()
const Member = require('../models/member')
const nodemailer = require('nodemailer')
const multer = require('multer'); // For image uploads
const path = require('path');
const { connections } = require('mongoose');

// Regular expression for email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const baseUrl = process.env.API_BASE_URL;


// Function to send a verification email
const sendVerificationEmail = async (email, verificationToken) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'snowbrokensb@gmail.com',
      pass: 'phcvwnkeizpasstd',
    },
  });

  const mailOptions = {
    from: 'snowbrokensb@gmail.com',
    to: email,
    subject: 'Business Network Forum - Verify Your Email',
    text: `Click the following link to verify your email: ${baseUrl}/api/members/verify?token=${verificationToken}`,
  };

  await transporter.sendMail(mailOptions);
};

membersRouter.post('/', async (request, response) => {
  const { username, email, password } = request.body;

  // Input validation (optional but recommended)
  if (!username || !email || !password) {
    return response.status(400).json({ error: 'username, email, and password must be provided' });
  }

  // Check for username and email uniqueness
  try {
    const existingUser = await Member.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return response.status(400).json({ error: 'Username already exists' });
      } else {
        return response.status(400).json({ error: 'Email already exists' });
      }
    }
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Server error' });
  }

  // Validate password length
  if (password.length < 3) {
    return response.status(400).json({ error: 'Password must be at least 3 characters long' });
  }

  // Validate email format
  if (!emailRegex.test(email)) {
    return response.status(400).json({ error: 'Invalid email format' });
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const verificationToken = await bcrypt.hash(Math.random().toString(), 10); // Generate random verification token

  const user = new Member({
    username,
    email,
    passwordHash,
    memberProfile: {},
    verificationToken,
    connections: [],
  });

  try {
    const savedUser = await user.save();

    await sendVerificationEmail(email, verificationToken); // Send verification email

    response.status(201).json({ message: 'Registration successful. Please verify your email to activate your account' });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Failed to register user' });
  }
});


// New route for email verification
membersRouter.get('/verify', async (request, response) => {
  const { token } = request.query;

  const user = await Member.findOne({ verificationToken: token });
  if (!user) {
    return response.status(400).json({ error: 'Invalid verification token' });
  }

  user.verificationToken = undefined; // Clear token after verification
  user.isVerified = true;
  await user.save();

  response.status(200).json({ message: 'Email verified successfully!' });
});





// New middleware for JWT verification (place before protected routes)
const verifyToken = (request, response, next) => {
  const authorization = request.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'missing or invalid authorization token' });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.SECRET, (error, decodedToken) => {
    if (error) {
      return response.status(401).json({ error: 'invalid token' });
    }

    // Store decoded user ID and access token in request object
    request.userId = decodedToken.id;
    request.accessToken = token; // Add access token for route access
    next(); // Continue to the next middleware or route handler
  });
};


// GET route to fetch all member profiles with memberProfile available
membersRouter.get('/profiles', async (request, response) => {
  try {
    // Query the database to retrieve members with memberProfile available
    const profiles = await Member.find({ memberProfile: { $exists: true } }, { email: 0, passwordHash: 0, verificationToken: 0, isVerified: 0, createdAt: 0, updatedAt: 0 });
    console.log(profiles);
    response.status(200).json(profiles); // Send the profiles as a JSON response
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Failed to fetch member profiles' });
  }
});



// Update member profile route with JWT verification
membersRouter.get('/profile', verifyToken, async (request, response) => {
  const userId = request.userId; // Get user ID from decoded token
  const accessToken = request.accessToken; // Access the stored access token

  try {
    // Optional verification using the access token on the backend (if needed)
    // ... (verification logic using accessToken)

    const user = await Member.findById(userId);

    if (!user) {
      return response.status(404).json({ error: 'User not found' });
    }

    response.status(200).json(user); // Send user data including profile information
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Failed to retrieve profile' });
  }
});


membersRouter.post('/profile', verifyToken, async (request, response) => {
  const userId = request.userId; // Get user ID from decoded token

  // Validate data (already included in previous responses)
  const requiredFields = ['name', 'company'];
  const missingFields = requiredFields.filter((field) => !request.body[field]);

  if (missingFields.length > 0) {
    return response.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`,
    });
  }

  const { name, photo, designation, company, experience, skills, website } = request.body;

  try {
    // Find the member by user ID
    const member = await Member.findById(userId);

    if (!member) {
      return response.status(404).json({ error: 'Member not found' });
    }

    // Update member profile data
    member.memberProfile = { name, photo, designation, company, experience, skills, website };

    // Save the updated member document
    const updatedMember = await member.save();

    response.status(200).json(updatedMember); // Send updated profile data with status 200 (OK)
  } catch (error) {
    console.error(error);
    // Handle specific errors (e.g., validation errors from Mongoose)
    response.status(400).json({ error: 'Failed to update profile' }); // Generic error for now
  }
});

membersRouter.put('/profile', verifyToken, async (request, response) => {
  const userId = request.userId; // Get user ID from decoded token
  const { name, photo, designation, company, experience, skills, website } = request.body;

  try {
    const updatedUser = await Member.findByIdAndUpdate(
      userId,
      { $set: { memberProfile: { name, photo, designation, company, experience, skills, website } } },
      { new: true } // Return the updated user document
    );

    if (!updatedUser) {
      return response.status(404).json({ error: 'User not found' });
    }

    response.status(200).json(updatedUser); // Send updated user data
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Failed to update profile' });
  }
});


// Configure multer for image uploads
const upload = multer({
  dest: 'uploads/', // Temporary directory for uploaded images (optional)
  limits: { fileSize: 1000000 }, // Limit file size to 1MB (optional)
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extname = path.extname(file.originalname);
    if (allowedExtensions.includes(extname)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG images are allowed'));
    }
  },
});

// Upload route handler
membersRouter.post('/upload/photo', upload.single('photo'), async (req, res) => {
  try {
    // Access uploaded image file details (optional)
    const { filename, path: filePath } = req.file; // Assuming a single 'photo' field

    // Implement logic to store the uploaded image (e.g., move to a permanent storage location or save path/filename in database)
    const imageUrl = `${process.env.API_BASE_URL}/images/${filename}`; // Replace with your actual storage logic

    res.status(200).json({ imageUrl }); // Send uploaded image URL in response
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to upload image' });
  }
});

module.exports = membersRouter
