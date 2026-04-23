import { forwardRef, useState, useImperativeHandle, useMemo, useEffect } from "react";
import { getFriendsforGroupCreation } from "../services/conversations";
const NewGroup = forwardRef(({ onCreate, onClose }, ref) => {
    const [groupName, setGroupName] = useState("");
    const [groupCaption, setGroupCaption] = useState("");
    const [groupAvatar, setGroupAvatar] = useState(null);
    const [search, setSearch] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState([]);
    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const friends = await getFriendsforGroupCreation();
                setUsers(friends || []);
            } catch (error) {
                console.error("Failed to fetch friends", error);
            }
        };
        fetchFriends();
    }, []);
    const reset = () => {
        setGroupName("");
        setGroupCaption("");
        setSearch("");
        setSelectedUsers([]);
        setGroupAvatar(null);
    };
    useImperativeHandle(ref, () => ({
        open: () => setOpen(true),
        close: () => {
            setOpen(false);
            reset();
        }
    }));
    const filteredUsers = useMemo(() => {
        return users?.filter((u) =>
            u.userName.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    const toggleUser = (user) => {
        const isSelected = selectedUsers.some((u) => u._id === user._id);

        if (isSelected) {
            setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setGroupAvatar(URL.createObjectURL(file));
        }
    };

    if (!open) return null;

    return (
        <div className="mobile-full-screen">
            <div className="safe-area">

                {/* Header */}
                <header className="minimal-header">
                    <button
                        className="text-btn"
                        onClick={() => {
                            setOpen(false);
                            reset();
                            onClose?.();
                        }}
                    >
                        Cancel
                    </button>

                    <h3>New Group</h3>

                    <button
                        className={`text-btn primary ${groupName && selectedUsers.length >= 2 ? "active" : ""
                            }`}
                        onClick={() => {
                            if (groupName && selectedUsers.length >= 2) {
                                onCreate({
                                    groupName,
                                    groupCaption,
                                    groupAvatar,
                                    participants: selectedUsers
                                });
                            }
                        }}
                    >
                        Create
                    </button>
                </header>

                <div className="scroll-content">

                    {/* Group Avatar + Inputs */}
                    <section className="group-header-section">

                        <label className="avatar-upload">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                hidden
                            />
                            <div className="group-avatar">
                                {groupAvatar ? (
                                    <img src={groupAvatar} alt="avatar" />
                                ) : (
                                    <span>+</span>
                                )}
                            </div>
                        </label>
                        <div className="group-inputs">
                            <input
                                type="text"
                                className="ghost-input"
                                placeholder="Group Name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                autoFocus
                            />

                            <textarea
                                className="caption-input"
                                placeholder="Add group caption..."
                                value={groupCaption}
                                onChange={(e) => setGroupCaption(e.target.value)}
                                rows={2}
                            />

                        </div>
                    </section>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="chip-tray">
                            {selectedUsers.map((user) => (
                                <div
                                    key={user._id}
                                    className="glass-chip"
                                    onClick={() => toggleUser(user)}
                                >
                                    {user.userName} <span>✕</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Search */}
                    <div className="search-container">
                        <input
                            type="text"
                            className="search-bar"
                            placeholder="Add People..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Friend List */}
                    <div className="minimal-list">
                        <p className="list-label">SUGGESTED</p>

                        {filteredUsers.map((user) => {
                            const isSelected = selectedUsers.some(
                                (u) => u._id === user._id
                            );

                            return (
                                <div
                                    key={user._id}
                                    className={`list-item ${isSelected ? "selected" : ""}`}
                                    onClick={() => toggleUser(user)}
                                >
                                    <div className="avatar">
                                        <img
                                            src={user.profilePicture || "https://via.placeholder.com/100"}
                                            alt={user.userName}
                                        />
                                    </div>

                                    <span className="username">{user.userName}</span>

                                    <div
                                        className={`radio-circle ${isSelected ? "checked" : ""
                                            }`}
                                    />
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

            <style>{`

.mobile-full-screen{
position:fixed;
top:0;
left:0;
width:100vw;
height:100dvh;
background:#0a0a0a;
color:#fff;
z-index:10000;
display:flex;
flex-direction:column;
animation:slideUp 0.3s ease-out;
}

.safe-area{
display:flex;
flex-direction:column;
height:100%;
padding:env(safe-area-inset-top) 0;
}

.minimal-header{
display:flex;
justify-content:space-between;
align-items:center;
padding:14px 20px;
border-bottom:1px solid #1f1f1f;
}

.minimal-header h3{
margin:0;
font-size:1.1rem;
font-weight:600;
}

.text-btn{
background:none;
border:none;
color:#999;
font-size:0.95rem;
cursor:pointer;
}

.text-btn.primary{
font-weight:600;
}

.text-btn.primary.active{
color:white;
}

.scroll-content{
flex:1;
overflow-y:auto;
padding-bottom:40px;
}

.group-header-section{
display:flex;
align-items:center;
gap:15px;
padding:20px;
}

.group-avatar{
width:70px;
height:70px;
border-radius:50%;
background:#1a1a1a;
display:flex;
align-items:center;
justify-content:center;
font-size:28px;
cursor:pointer;
overflow:hidden;
}

.group-avatar img{
width:100%;
height:100%;
object-fit:cover;
}

.group-inputs{
flex:1;
}

.ghost-input{
width:100%;
background:none;
border:none;
border-bottom:1px solid #2a2a2a;
font-size:1.3rem;
color:white;
outline:none;
padding-bottom:8px;
}

.caption-input{
width:100%;
background:#121212;
border:none;
border-radius:10px;
padding:10px;
color:#ccc;
font-size:0.9rem;
margin-top:8px;
resize:none;
}

.chip-tray{
display:flex;
flex-wrap:wrap;
gap:8px;
padding:0 20px 16px;
}

.glass-chip{
background:#181818;
padding:6px 12px;
border-radius:100px;
font-size:0.85rem;
display:flex;
align-items:center;
gap:8px;
cursor:pointer;
}

.search-container{
padding:0 20px;
margin-bottom:20px;
}

.search-bar{
width:100%;
background:#121212;
border:none;
padding:12px 16px;
border-radius:12px;
color:white;
font-size:0.95rem;
}

.list-label{
padding:0 20px;
font-size:0.75rem;
color:#666;
letter-spacing:1px;
margin-bottom:10px;
}

.minimal-list{
display:flex;
flex-direction:column;
}

.list-item{
display:flex;
align-items:center;
padding:12px 20px;
gap:14px;
cursor:pointer;
transition:background 0.2s;
}

.list-item:active{
background:#181818;
}

.avatar{
width:44px;
height:44px;
background:#222;
border-radius:50%;
overflow:hidden;
}

.avatar img{
width:100%;
height:100%;
object-fit:cover;
}

.username{
flex:1;
font-size:0.95rem;
}

.radio-circle{
width:20px;
height:20px;
border:2px solid #444;
border-radius:50%;
}

.radio-circle.checked{
background:white;
border-color:white;
}

@keyframes slideUp{
from{transform:translateY(100%)}
to{transform:translateY(0)}
}

.scroll-content::-webkit-scrollbar{
display:none;
}

      `}</style>
        </div>
    );
});

export default NewGroup;

