const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const Member = require('../models/member')


loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  const member = await Member.findOne({ username })
  const passwordCorrect = member === null
    ? false
    : await bcrypt.compare(password, member.passwordHash)

  if (!(member && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password'
    })
  }

  
if (!member.isVerified) {
  return response.status(401).json({ error: 'Please verify your email to activate your account' });
}

  const userForToken = {
    username: member.username,
    id: member._id,
  }

  const accessToken = jwt.sign(userForToken, process.env.SECRET, { expiresIn: '60m' }); // Access token (shorter expiry)
  const refreshToken = jwt.sign({ userId: member._id }, process.env.REFRESH_SECRET, { expiresIn: '7d' }); // Refresh token (longer expiry)

  response
    .status(200)
    .send({ accessToken, refreshToken, username: member.username, name: member.name, id:member.id })
})



loginRouter.post('/verify-access-token', async (request, response) => {
  const authorization = request.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'missing or invalid authorization token' });
  }

  const token = authorization.split(' ')[1];

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET);
    
    // Decode the token to get the user ID
    const userId = decodedToken.id;

    // Find the user from the Member collection using the user ID
    const user = await Member.findById(userId);

    // Check if the user exists
    if (!user) {
      return response.status(404).json({ error: 'user not found' });
    }

    // Send the user ID and username as a response
    response.status(200).json({ id: user._id, username: user.username });
  } catch (error) {
    response.status(401).json({ error: 'invalid token' });
  }
});



loginRouter.post('/refresh-token', async (request, response) => {
  const authorization = request.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'missing or invalid authorization token' });
  }

  const refreshToken = authorization.split(' ')[1];

  try {
    const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const userId = decodedRefreshToken.userId;

    const user = await Member.findById(userId);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized (invalid refresh token or user not found)' });
    }

    // Generate new access token
    const newToken = jwt.sign({ userForToken }, process.env.SECRET, { expiresIn: '30m' });

    response.status(200).json({ token: newToken });
  } catch (error) {
    response.status(401).json({ error: 'invalid refresh token' });
  }
});

module.exports = loginRouter