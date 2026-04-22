const SUPABASE_URL = 'https://ftqvvxhmdtxeumdtwlyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cXZ2eGhtZHR4ZXVtZHR3bHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NDQ5MTEsImV4cCI6MjA5MjMyMDkxMX0.6OXUNjePIGDsWAO_u94mOOnn-dWwRSlHqaY4fFgxuZA';
 
const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Prefer': 'return=representation' 
};
 
function connectRealtime() {
  const wsUrl = 'wss://' + SUPABASE_URL.replace('https://', '') + '/realtime/v1/websocket'
    + '?apikey=' + SUPABASE_KEY + '&vsn=1.0.0';
 
  const socket = new WebSocket(wsUrl);
  socket.addEventListener('open', function () {
    setInterval(function () {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null }));
      }
    }, 25000);

    socket.send(JSON.stringify({
      topic: 'realtime:public:posts',
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: [
            { event: 'INSERT', schema: 'public', table: 'posts' },
            { event: 'UPDATE', schema: 'public', table: 'posts' },
            { event: 'DELETE', schema: 'public', table: 'posts' }
          ]
        }
      },
      ref: '1'
    }));
  });
 
  socket.addEventListener('message', function (event) {
    const msg = JSON.parse(event.data);

    if (msg.event === 'postgres_changes') {
      render(); 
    }
  });
 
  // 연결이 끊기면 3초 후 자동 재연결
  socket.addEventListener('close', function () {
    setTimeout(connectRealtime, 3000);
  });
}
 
async function render() {
  const tbody = document.getElementById('post-list');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">불러오는 중...</td></tr>';
 
  const response = await fetch(SUPABASE_URL + '/rest/v1/posts?order=created_at.desc', {
    method: 'GET',
    headers: headers
  });
 
  const posts = await response.json();
  tbody.innerHTML = '';
 
  if (posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">게시글이 없습니다.</td></tr>';
    return;
  }
 
  posts.forEach(function(p, index) {
    let date = p.created_at ? p.created_at.slice(0, 10) : '';
    let num = posts.length - index;
 
    let tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + num + '</td>' +
      '<td class="title-cell" onclick="viewPost(' + p.id + ')">' + p.title + '</td>' +
      '<td>' + p.author + '</td>' +
      '<td>' + date + '</td>' +
      '<td>' + p.views + '</td>' +
      '<td><button class="btn btn-red" onclick="deletePost(' + p.id + ')">삭제</button></td>';
    tbody.appendChild(tr);
  });
}
 
async function viewPost(id) {
  const response = await fetch(SUPABASE_URL + '/rest/v1/posts?id=eq.' + id, {
    method: 'GET',
    headers: headers
  });
 
  const data = await response.json();
  if (!data || data.length === 0) return;
 
  const post = data[0];
 
  await fetch(SUPABASE_URL + '/rest/v1/posts?id=eq.' + id, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({ views: post.views + 1 })
  });
 
  let date = post.created_at ? post.created_at.slice(0, 10) : '';

  document.getElementById('d-title').textContent  = post.title;
  document.getElementById('d-author').textContent = post.author;
  document.getElementById('d-date').textContent   = date;
  document.getElementById('d-views').textContent  = post.views + 1;
  document.getElementById('d-body').textContent   = post.body;
 
  document.getElementById('detail-view').style.display = 'block';

  render();
 

  document.getElementById('detail-view').scrollIntoView({ behavior: 'smooth' });
}
 
function closeDetail() {
  document.getElementById('detail-view').style.display = 'none';
}
 

function openModal() {
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('modal').style.display = 'block';
}
 
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
  // 입력값 초기화
  document.getElementById('inp-title').value = '';
  document.getElementById('inp-author').value = '';
  document.getElementById('inp-body').value = '';
}
 
async function submitPost() {
  let title  = document.getElementById('inp-title').value.trim();
  let author = document.getElementById('inp-author').value.trim();
  let body   = document.getElementById('inp-body').value.trim();

  if (title === '') {
    alert('제목을 입력해주세요!');
    return;
  }
  if (author === '') {
    alert('작성자 이름을 입력해주세요!');
    return;
  }
  if (body === '') {
    alert('내용을 입력해주세요!');
    return;
  }

  const response = await fetch(SUPABASE_URL + '/rest/v1/posts', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      title: title,
      author: author,
      body: body,
      views: 0
    })
  });
 
  if (response.ok) {
    alert('게시글이 등록되었습니다!');
    closeModal();
    render();
  } else {
    alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}

async function deletePost(id) {

  let confirmed = confirm('정말로 이 게시글을 삭제하시겠습니까?');
  if (!confirmed) return;
 
  
  const response = await fetch(SUPABASE_URL + '/rest/v1/posts?id=eq.' + id, {
    method: 'DELETE',
    headers: headers
  });
 
  if (response.ok) {
    alert('게시글이 삭제되었습니다.');
    closeDetail();
    render();
  } else {
    alert('삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}
render();
connectRealtime();