function UserAvatar({ initials, color = '#6e5dc6', small = false }) {
  return (
    <span className={small ? 'user-avatar user-avatar-small' : 'user-avatar'} style={{ '--avatar-color': color }}>
      {initials}
    </span>
  );
}

export default UserAvatar;
/*
File summary:
- Reusable circular avatar component.
- Displays initials with optional color and compact sizing.
- Used in navigation and card member/footer displays.
*/
