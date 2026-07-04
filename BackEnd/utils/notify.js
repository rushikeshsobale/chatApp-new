const Notification = require('../Modules/Notifications');
const Muser = require('../Modules/Muser');

// Creates a Notification row and pushes it live to the recipient's socket
// room in one step, so the persisted row and the live push never drift
// apart. Every domain route that should notify someone calls this instead
// of duplicating create+populate+emit itself.
async function notify(io, { recipient, sender, type, post, verb }) {
  if (!recipient || String(recipient) === String(sender)) return null;

  const senderUser = await Muser.findById(sender).select('userName');
  const notification = await Notification.create({
    recipient,
    sender,
    type,
    post,
    message: `${senderUser?.userName || 'Someone'} ${verb}`,
  });

  const populated = await notification.populate('sender', 'userName profilePicture');
  io.to(String(recipient)).emit('got_a_notification', populated);
  return populated;
}

module.exports = { notify };
