// Admin: create or edit a promo (video upload + caption text).
// ROLE GUARD 2: admins only.
if (Auth.requireAdmin()) {
  $(function () {
    Layout.init({ active: 'admin', admin: 'promo-form' });
    const id = Shared.param('id');
    let file = null;

    function fieldError(name, msg) {
      $('#' + name).toggleClass('border-red-400', !!msg).attr('aria-invalid', !!msg);
      $('#' + name + '-err').text(msg || '').toggleClass('hidden', !msg);
    }
    function preview(src) {
      if (!src) return;
      $('#video-preview').attr('src', src).removeClass('hidden');
      $('#video-drop').addClass('aspect-auto py-4');
      $('#video-placeholder').text('Choose a different video');
    }

    // Validate type and size before upload (8 MB, mp4/mov/avi/mkv).
    $('#video').on('change', function () {
      fieldError('video', null);
      const f = this.files[0];
      if (!f) return;
      const err = Shared.checkFile(f, 'video');
      if (err) { file = null; $(this).val(''); return fieldError('video', err); }
      file = f;
      preview(URL.createObjectURL(f));
      $('#video-info').text(`${f.name} · ${Shared.fmtSize(f.size)}`).removeClass('hidden');
    });

    async function loadExisting() {
      $('#form-title').text('Edit promo');
      $('#save-btn').text('Save changes');
      $('#video-req').addClass('hidden');
      $('#pub-wrap').removeClass('hidden').addClass('flex');
      $('#cancel-link').attr('href', '../promo-detail.html?id=' + encodeURIComponent(id));
      try {
        const { data } = await Api.get('/promos/' + id);
        $('#title').val(data.title);
        $('#description').val(data.description || '');
        $('#caption_text').val(data.caption_text || '');
        $('#published').prop('checked', !!data.published);
        preview(data.video_url);
      } catch (err) { UI.toast(err.message, 'error'); }
    }

    $('#promo-form').on('submit', async function (e) {
      e.preventDefault();
      const v = { title: $('#title').val().trim(), description: $('#description').val().trim(), caption_text: $('#caption_text').val().trim() };
      ['title', 'description', 'caption_text', 'video'].forEach((f) => fieldError(f, null));
      let ok = true;
      if (v.title.length < 3) { fieldError('title', 'Give the promo a title (at least 3 characters).'); ok = false; }
      if (!v.description) { fieldError('description', 'Add a short description.'); ok = false; }
      if (!v.caption_text) { fieldError('caption_text', 'Caption text is required (it powers the captions).'); ok = false; }
      if (!id && !file) { fieldError('video', 'Please choose a video.'); ok = false; }
      if (!ok) return $('[aria-invalid="true"]').first().trigger('focus');

      const form = new FormData();
      Object.entries(v).forEach(([k, val]) => form.append(k, val));
      if (id) form.append('published', $('#published').is(':checked'));
      if (file) form.append('video', file);

      const $btn = $('#save-btn');
      UI.btnLoading($btn, true, id ? 'Saving…' : 'Uploading video…');
      try {
        const res = id ? await Api.upload('PUT', '/promos/' + id, form) : await Api.upload('POST', '/promos', form);
        Shared.cache.drop('promos');
        UI.flash(id ? 'Promo updated.' : 'Promo uploaded. Everyone has been notified.', 'success');
        location.href = '../promo-detail.html?id=' + encodeURIComponent((res.data && res.data.id) || id);
      } catch (err) {
        UI.btnLoading($btn, false);
        if (err.errors && err.errors.length) err.errors.forEach((f) => fieldError(f.field, f.message));
        else UI.toast(err.message, 'error');
      }
    });

    if (id) loadExisting();
  });
}
