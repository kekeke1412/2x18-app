// src/services/googleApi.js

/**
 * Tạo sự kiện trên Google Calendar, có tùy chọn sinh link Google Meet.
 */
export async function createCalendarEvent(token, { title, description, date, startTime, endTime, createMeetLink, reminderMinutes }) {
  // Định dạng ISO 8601 string
  const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
  // Nếu không có endTime, mặc định cộng 1 tiếng
  let endDateTime = '';
  if (endTime) {
    endDateTime = new Date(`${date}T${endTime}:00`).toISOString();
  } else {
    const end = new Date(`${date}T${startTime}:00`);
    end.setHours(end.getHours() + 1);
    endDateTime = end.toISOString();
  }

  const event = {
    summary: title,
    description: description || '',
    start: { dateTime: startDateTime, timeZone: 'Asia/Ho_Chi_Minh' },
    end: { dateTime: endDateTime, timeZone: 'Asia/Ho_Chi_Minh' },
    // Gửi reminder lên Google Calendar nếu có chọn
    reminders: reminderMinutes
      ? {
          useDefault: false,
          overrides: [
            { method: 'popup',  minutes: reminderMinutes }, // Thông báo popup trên GG Cal
            { method: 'email',  minutes: reminderMinutes }, // Email nhắc nhở
          ],
        }
      : { useDefault: true }, // Dùng cài đặt mặc định của GG Calendar
  };

  if (createMeetLink) {
    event.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Lỗi khi tạo sự kiện Calendar');
  }

  const data = await response.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink, // Link xem sự kiện trên Calendar
    meetLink: data.hangoutLink || null, // Link Google Meet
  };
}


/**
 * Upload file lên Google Drive, tự động gom vào thư mục "2X18_Reports"
 */
export async function uploadToDrive(token, file, folderName = '2X18_Reports') {
  // 1. Tìm xem thư mục đã tồn tại chưa
  let folderId = await getOrCreateFolder(token, folderName);

  // 2. Upload file
  // Drive API v3 yêu cầu multipart upload để gửi metadata (tên, folder) và nội dung file cùng lúc
  const metadata = {
    name: file.name,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: form
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Lỗi khi upload file lên Drive');
  }

  const data = await response.json();
  const fileId = data.id;

  // 3. Mở quyền xem cho bất kỳ ai có link (anyone with link can view)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (err) {
    console.error('Lỗi khi set quyền Drive:', err);
    // Vẫn tiếp tục vì file đã upload xong, chỉ là quyền có thể chưa mở
  }

  // WebViewLink là link có thể mở trực tiếp để xem file
  return data.webViewLink;
}

/**
 * Tìm thư mục theo tên, nếu không có thì tự tạo mới
 */
async function getOrCreateFolder(token, folderName) {
  // Tìm thư mục
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
  } catch (err) {
    console.warn('Không thể tìm kiếm thư mục Drive:', err);
  }

  // Không có -> Tạo mới
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    console.warn('Không thể tạo thư mục Drive, sẽ lưu vào thư mục gốc.');
    return null; // Trả về null để upload vào root
  }

  const createData = await createRes.json();
  return createData.id;
}
