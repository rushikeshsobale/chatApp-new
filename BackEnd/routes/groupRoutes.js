const express = require("express")
const Group = require('../Modules/Group');
const verifyToken = require('./verifyToken');
const router = express.Router();

 router.post ('/createGroup',verifyToken, async (req, res) => {
  const { name, members, admins = [] } = req.body;
  const createdBy = req.decoded.userId;

  if (!name || !members || members.length === 0) {
    return res.status(400).json({ error: 'Group name and at least one member are required.' });
  }

  // Make sure creator is in the members and admins list
  if (!members.includes(createdBy.toString())) {
    members.push(createdBy);
  }
  if (!admins.includes(createdBy.toString())) {
    admins.push(createdBy);
  }

  try {
    const newGroup = new Group({
      name,
      members,
      admins,
      createdBy,
    });

    const savedGroup = await newGroup.save();
    res.status(201).json(savedGroup);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Every mutation below requires the caller to be authenticated and, since
// this app has no other notion of group permissions, to already be a
// member/admin of the group they're trying to change — mirroring the
// admin-only intent the (previously broken) delete route already implied.
const isMember = (group, userId) => group.members.some(m => m.toString() === userId);
const isAdmin = (group, userId) => group.admins.some(a => a.toString() === userId);

router.put('/:id/name', verifyToken, async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isAdmin(group, req.decoded.userId)) {
        return res.status(403).json({ error: 'Only admins can rename this group' });
      }
      group.name = req.body.name;
      await group.save();
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: 'Error updating group name' });
    }
  });

  // Add members
  router.put('/:id/members/add', verifyToken, async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isMember(group, req.decoded.userId)) {
        return res.status(403).json({ error: 'Only existing members can add members' });
      }

      group.members = Array.from(new Set([...group.members.map(id => id.toString()), ...req.body.members]));
      await group.save();
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: 'Error adding members' });
    }
  });

  // Remove members
  router.put('/:id/members/remove', verifyToken, async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isAdmin(group, req.decoded.userId)) {
        return res.status(403).json({ error: 'Only admins can remove members' });
      }

      const idsToRemove = req.body.members;
      group.members = group.members.filter(id => !idsToRemove.includes(id.toString()));
      group.admins = group.admins.filter(id => !idsToRemove.includes(id.toString()));
      await group.save();
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: 'Error removing members' });
    }
  });

  // Add admins
  router.put('/:id/admins/add', verifyToken, async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isAdmin(group, req.decoded.userId)) {
        return res.status(403).json({ error: 'Only admins can grant admin rights' });
      }

      const invalidAdmins = req.body.admins.filter(admin => !group.members.map(m => m.toString()).includes(admin));
      if (invalidAdmins.length > 0) {
        return res.status(400).json({ error: 'All admins must be existing members' });
      }

      group.admins = Array.from(new Set([...group.admins.map(id => id.toString()), ...req.body.admins]));
      await group.save();
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: 'Error adding admins' });
    }
  });

  // Remove admins
  router.put('/:id/admins/remove', verifyToken, async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isAdmin(group, req.decoded.userId)) {
        return res.status(403).json({ error: 'Only admins can revoke admin rights' });
      }

      group.admins = group.admins.filter(id => !req.body.admins.includes(id.toString()));
      await group.save();
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: 'Error removing admins' });
    }
  });

  // Get all groups for a user
  router.get('/getAllGroups', verifyToken, async (req, res) => {
    try {
      const groups = await Group.find({ members: req.decoded.userId })
      .populate({
        path: 'members',
        select: 'userName profilePicture' // Specify the fields you want here
      });;
      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: 'Error fetching groups' });
    }
  });

  // Get specific group
  router.get('/getGroups/:id', verifyToken, async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isMember(group, req.decoded.userId)) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: 'Error fetching group' });
    }
  });

  // Delete group
  router.delete('/delete/Groups/:id', verifyToken, async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });

      if (!isAdmin(group, req.decoded.userId)) {
        return res.status(403).json({ error: 'Only admins can delete groups' });
      }

      await group.deleteOne();
      res.json({ message: 'Group deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Error deleting group' });
    }
  });

module.exports = router;
