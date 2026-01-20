const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/game/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI4OWM5NmZhLWE5NmYtNDRhNC05YWQwLTQzNWIyNmY5ZjE5OCIsInVzZXJuYW1lIjoiTUFSVElOIiwiZW1haWwiOiJtYXJ0aW5AZXhhbXBsZS5jb20iLCJoYXMyRkFFbmFibGVkIjpmYWxzZSwiaXMyRkFWZXJpZmllZCI6ZmFsc2UsImlhdCI6MTc2ODkzNjgwOCwiZXhwIjoxNzY4OTQwNDA4fQ.LEML-DWegmPXsamNxxrjnztQvBMIoScvLzRkiYcOpm8&matchId=a998aa5b-6b0f-4ffd-a282-b99ff403ead1');
ws.onopen = () => console.log('Conectado');
ws.onmessage = (msg) => console.log('Mensaje:', msg.data);
ws.onerror = (err) => console.error('Error:', err);
ws.onclose = () => console.log('Conexión cerrada');
