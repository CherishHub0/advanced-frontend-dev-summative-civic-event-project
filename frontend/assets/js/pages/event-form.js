// Admin: create or edit an event (with image upload + preview).
// ROLE GUARD 2: admins only. Normal users are sent back to Events.
if (Auth.requireAdmin()) {
  $(function () {
    Layout.init({ active: 'admin', admin: 'event-form' });
    const id = Shared.param('id');
    let file = null;
    let existingImage = null;

    function fieldError(name, msg) {
      $('#' + name).toggleClass('border-red-400', !!msg).attr('aria-invalid', !!msg);
      $('#' + name + '-err').text(msg || '').toggleClass('hidden', !msg);
    }
    function showPreview(src) {
      $('#preview').html(src
        ? `<img src="${UI.esc(src)}" alt="Selected cover image preview" class="h-48 w-full object-cover">`
        : '<span>Click to choose an image<br><span class="text-xs text-stone-400">or drag it here</span></span>');
    }

    // Validate the file BEFORE uploading: type and size, same limits as the backend.
    function pickFile(f) {
      fieldError('image', null);
      const err = Shared.checkFile(f, 'image');
      if (err) { fieldError('image', err); $('#image').val(''); return; }
      file = f;
      const reader = new FileReader();
      reader.onload = (e) => showPreview(e.target.result);
      reader.readAsDataURL(f);
      $('#image-info').text(`${f.name} · ${Shared.fmtSize(f.size)}`).removeClass('hidden');
      $('#image-clear').removeClass('hidden');
    }
    $('#image').on('change', function () { if (this.files[0]) pickFile(this.files[0]); });
    $('#image-clear').on('click', () => {
      file = null; $('#image').val(''); showPreview(existingImage);
      $('#image-info, #image-clear').addClass('hidden');
    });
    // Drag and drop
    $('#drop').on('dragover', (e) => { e.preventDefault(); $('#drop').addClass('border-sage-400 bg-sage-50'); })
      .on('dragleave drop', () => $('#drop').removeClass('border-sage-400 bg-sage-50'))
      .on('drop', (e) => { e.preventDefault(); const f = e.originalEvent.dataTransfer.files[0]; if (f) pickFile(f); });

    // Edit mode: load the event and fill the form.
    async function loadExisting() {
      $('#form-title').text('Edit event');
      $('#save-btn').text('Save changes');
      $('#cancel-link').attr('href', '../event-detail.html?id=' + encodeURIComponent(id));
      document.title = 'Edit event · Admin · CivicEvents+';
      $('#event-form :input').prop('disabled', true);
      try {
        const { data: ev } = await Api.get('/events/' + id);
        $('#title').val(ev.title);
        $('#description').val(ev.description || '');
        $('#location').val(ev.location || '');
        $('#starts_at').val(Shared.toLocalInput(ev.starts_at));
        $('#ends_at').val(Shared.toLocalInput(ev.ends_at));
        existingImage = ev.metadata && ev.metadata.image_url;
        showPreview(existingImage);
      } catch (err) {
        UI.toast(err.status === 404 ? 'That event no longer exists.' : err.message, 'error');
      } finally {
        $('#event-form :input').prop('disabled', false);
      }
    }

    function validate(v) {
      let ok = true;
      ['title', 'location', 'starts_at', 'ends_at'].forEach((f) => fieldError(f, null));
      if (v.title.length < 3) { fieldError('title', 'Give the event a title (at least 3 characters).'); ok = false; }
      if (!v.location) { fieldError('location', 'Where is it happening?'); ok = false; }
      if (!v.starts_at) { fieldError('starts_at', 'Choose a start date and time.'); ok = false; }
      if (!v.ends_at) { fieldError('ends_at', 'Choose an end date and time.'); ok = false; }
      if (v.starts_at && v.ends_at && new Date(v.ends_at) <= new Date(v.starts_at)) { fieldError('ends_at', 'The end must be after the start.'); ok = false; }
      if (ok === false) $('[aria-invalid="true"]').first().trigger('focus');
      return ok;
    }

    $('#event-form').on('submit', async function (e) {
      e.preventDefault();
      const v = {
        title: $('#title').val().trim(),
        description: $('#description').val().trim(),
        location: $('#location').val().trim(),
        starts_at: $('#starts_at').val(),
        ends_at: $('#ends_at').val(),
      };
      if (!validate(v)) return;

      // Multipart form: text fields + optional "image" file (backend field name).
      const form = new FormData();
      form.append('title', v.title);
      form.append('description', v.description);
      form.append('location', v.location);
      form.append('starts_at', new Date(v.starts_at).toISOString());
      form.append('ends_at', new Date(v.ends_at).toISOString());
      if (file) form.append('image', file);

      const $btn = $('#save-btn');
      UI.btnLoading($btn, true, id ? 'Saving…' : 'Creating…');
      try {
        const res = id ? await Api.upload('PUT', '/events/' + id, form) : await Api.upload('POST', '/events', form);
        Shared.cache.drop('events');
        UI.flash(id ? 'Event updated.' : 'Event created. Everyone has been notified.', 'success');
        location.href = '../event-detail.html?id=' + encodeURIComponent((res.data && res.data.id) || id);
      } catch (err) {
        UI.btnLoading($btn, false);
        if (err.errors && err.errors.length) err.errors.forEach((f) => fieldError(f.field, f.message));
        else UI.toast(err.message, 'error');
      }
    });

    if (id) loadExisting();
  });
}
