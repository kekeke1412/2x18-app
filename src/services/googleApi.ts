// @ts-nocheck
// src/services/googleApi.js
import { checkGoogleResponse } from './googleErrors.js';

/**
 * Tạo sự kiện trên Google Calendar, có tùy chọn sinh link Google Meet.
 */
export async function createCalendarEvent(token, { title, description, date, startTime, endTime, createMeetLink, reminderMinutes }) {
  // Định dạng ISO 8601 string
  const startDateTime = new Date(`${date}T${startTime}:00+07:00`).toISOString();
  // Nếu không có endTime, mặc định cộng 1 tiếng
  let endDateTime = '';
  if (endTime) {
    endDateTime = new Date(`${date}T${endTime}:00+07:00`).toISOString();
  } else {
    const end = new Date(`${date}T${startTime}:00+07:00`);
    end.setHours(end.getHours() + 1);
    endDateTime = end.toISOString();
  }

  if (new Date(endDateTime) <= new Date(startDateTime)) throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');

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

  await checkGoogleResponse(response, 'Lỗi khi tạo sự kiện Calendar');

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
export async function uploadToDrive(token, file, folderName = '2X18_Reports', onWarning = console.warn) {
  // 1. Tìm xem thư mục đã tồn tại chưa
  let folderId = await getOrCreateFolder(token, folderName);

  // 2. Upload file
  // Drive API v3 yêu cầu multipart/related upload để gửi metadata và nội dung
  const metadata = {
    name: file.name,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: ' + (file.type || 'application/octet-stream') + '\r\n\r\n',
    file,
    close_delim
  ], { type: 'multipart/related; boundary=' + boundary });

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: multipartRequestBody
  });

  await checkGoogleResponse(response, 'Lỗi khi upload file lên Drive');

  const data = await response.json();
  const fileId = data.id;

  // 3. Mở quyền xem cho bất kỳ ai có link (anyone with link can view)
  try {
    const sharing = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
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
    await checkGoogleResponse(sharing, 'Chưa cấp được quyền chia sẻ tài liệu.');
  } catch (err) {
    onWarning('File đã tải lên; chưa mở được quyền xem cho nhóm. Hãy cấp quyền chia sẻ trong Google Drive.');
    // Vẫn tiếp tục vì file đã upload xong, chỉ là quyền có thể chưa mở
  }

  // WebViewLink là link có thể mở trực tiếp để xem file
  return data.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

/**
 * Tìm thư mục theo tên, nếu không có thì tự tạo mới
 */
async function getOrCreateFolder(token, folderName) {
  const escapedName = folderName.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${token}` } });
  await checkGoogleResponse(searchRes, 'Không tìm được thư mục Drive.');
  const searchData = await searchRes.json();
  if (searchData.files?.length) return searchData.files[0].id;
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' })
  });
  await checkGoogleResponse(createRes, 'Không tạo được thư mục Drive.');
  return (await createRes.json()).id;
}
