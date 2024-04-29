const express = require('express');
const connectionRouter = express.Router();
const Member = require('../models/member');

connectionRouter.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params; // Access the user ID from URL parameters

    console.log(userId)
    
    // Find the user by their ID and fetch their connections
    const user = await Member.findById(userId);
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    const connections = user.connections;

    res.status(200).send({ connections });
  } catch (error) {
    console.error('Error fetching user connections:', error);
    res.status(500).send({ error: 'Failed to fetch user connections' });
  }
});


connectionRouter.post('/request', async (req, res) => {
  try {
    const { memberId, connectionId } = req.body;
    console.log('Request Body:', req.body); // Log the request body to verify memberId and connectionId
    
    // Construct the new connection object
    const newConnection = { connectionId, accepted: false , requestedId: memberId};
    
    // Add the new connection to the member's pending connections
    const updateMember = { $push: { connections: { $each: [newConnection] } } };
    await Member.findByIdAndUpdate(memberId, updateMember);
    
    const newConnectionAccepter = { connectionId: memberId, accepted: false , requestedId: memberId};
    // Add the new connection to the requester's pending connections
    const updateAcceptingMember = { $push: { connections: { $each: [newConnectionAccepter] } } };
    await Member.findByIdAndUpdate(connectionId, updateAcceptingMember);

    res.status(201).send({ message: 'Connection request sent successfully' });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).send({ error: 'Failed to send connection request' });
  }
});


connectionRouter.delete('/cancel', async (req, res) => {
  try {
    const { memberId, connectionId } = req.body;

    // Remove the connection request from the member's connections
    await Member.findByIdAndUpdate(memberId, { $pull: { connections: { connectionId } } });

    // Remove the connection request from the requester's connections
    await Member.findByIdAndUpdate(connectionId, { $pull: { connections: { connectionId: memberId } } });

    res.status(200).send({ message: 'Connection request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling connection request:', error);
    res.status(500).send({ error: 'Failed to cancel connection request' });
  }
});






// Route to accept a connection request
connectionRouter.put('/accept', async (req, res) => {
  try {
    const { memberId, connectionId } = req.body;

    // Update the connection request to mark it as accepted and remove requestedId
    await Member.findOneAndUpdate(
      { _id: memberId, 'connections.connectionId': connectionId },
      { 
        $set: { 'connections.$.accepted': true },
        $unset: { 'connections.$.requestedId': '' } // Remove requestedId
      }
    );

    // Update the requester's connection to mark it as accepted and remove requestedId
    await Member.findOneAndUpdate(
      { _id: connectionId, 'connections.connectionId': memberId },
      { 
        $set: { 'connections.$.accepted': true },
        $unset: { 'connections.$.requestedId': '' } // Remove requestedId
      }
    );

    res.status(200).send({ message: 'Connection request marked as accepted successfully' });
  } catch (error) {
    console.error('Error marking connection request as accepted:', error);
    res.status(500).send({ error: 'Failed to mark connection request as accepted' });
  }
});



// Route to reject a connection request
connectionRouter.put('/reject', async (req, res) => {
  try {
    const { memberId, connectionId } = req.body;

    // Validate input data if necessary

    // Remove the request from pending connections
    await Member.findByIdAndUpdate(memberId, {
      $pull: { pendingConnections: connectionId }
    });

    res.status(200).send({ message: 'Connection request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    res.status(500).send({ error: 'Failed to reject connection request' });
  }
});

module.exports = connectionRouter;
