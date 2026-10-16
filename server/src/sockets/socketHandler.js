function initializeSocket(io) {
  io.on('connection', (socket) => {
    // Client connected
    socket.on('join_department', (deptId) => {
      if (deptId) {
        socket.join(`dept_${deptId}`);
      }
    });

    socket.on('leave_department', (deptId) => {
      if (deptId) {
        socket.leave(`dept_${deptId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
}

module.exports = {
  initializeSocket
};
