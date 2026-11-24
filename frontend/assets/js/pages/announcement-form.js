// Admin: create an announcement (audio upload) or edit its title/visibility.
// ROLE GUARD 2: admins only.
if (Auth.requireAdmin()) {
  $(function () {
    Layout.init({ active: 'admin', admin: 'announcement-form' });
    const id = Shared.param('id');
    let file = null;

    function fieldError(name, msg) {
      $('#' + name).toggleClass('border-red-400', !!msg).attr('aria-invalid', !!msg);
      $('#' + name + '-err').text(msg || '').toggleClass('hidden', !msg);
    }

    // Check type and size BEFORE uploading (same limits as the backend: 5 MB, mp3/wav/m4a/ogg).
    $('#audio').on('change', function () {
      fieldError('audio', null);
      const f = this.files[0];
      if (!f) return;
      const err = Shared.checkFile(f, 'audio');
      if (err) { file = null; $(this).val(''); $('#audio-preview').addClass('hidden'); $('#audio-name').text('Choose an audio file'); return fieldError('audio', err); }
      file = f;
      $('#audio-name').text(`${f.name} · ${Shared.fmtSize(f.size)}`);
      $('#audio-preview').attr('src', URL.createObjectURL(f)).removeClass('hidden');
    });

    async function loadExisting() {
      $('#form-title').text('Edit announcement');
      $('#form-sub').text('Change the title or who can see it.');
      $('#save-btn').text('Save changes');
      $('#audio-field').addClass('hidden');
      $('#audio-note').removeClass('hidden');
      $('#cancel-link').attr('href', '../announcement-detail.html?id=' + encodeURIComponent(id));
      try {
        const { data } = await Api.get('/announcements/' + id);
        $('#title').val(data.title);
        $('#published').prop('checked', !!data.published);
        $('#audio-preview').attr('src', data.audio_url);
      } catch (err) { UI.toast(err.message, 'error'); }
    }

    $('#ann-form').on('submit', async function (e) {
      e.preventDefault();
      const title = $('#title').val().trim();
      fieldError('title', null);
      let ok = true;
      if (title.length < 3) { fieldError('title', 'Give it a title (at least 3 characters).'); ok = false; }
      if (!id && !file) { fieldError('audio', 'Please choose an audio file.'); ok = false; }
      if (!ok) return;

      const $btn = $('#save-btn');
      UI.btnLoading($btn, true, id ? 'Saving…' : 'Uploading…');
      const published = $('#published').is(':checked');
      try {
        let res;
        if (id) {
          // Edits are text-only on the backend: title + published.
          const form = new FormData();
          form.append('title', title);
          form.append('published', published);
          res = await Api.upload('PUT', '/announcements/' + id, form);
        } else {
          const form = new FormData();
          form.append('title', title);
          form.append('published', published);
          form.append('audio', file);
          res = await Api.upload('POST', '/announcements', form);
        }
        Shared.cache.drop('announcements');
        UI.flash(id ? 'Announcement updated.' : 'Announcement published. Everyone has been notified.', 'success');
        location.href = '../announcement-detail.html?id=' + encodeURIComponent((res.data && res.data.id) || id);
      } catch (err) {
        UI.btnLoading($btn, false);
        if (err.errors && err.errors.length) err.errors.forEach((f) => fieldError(f.field, f.message));
        else UI.toast(err.message, 'error');
      }
    });

    if (id) loadExisting();
  });
}
