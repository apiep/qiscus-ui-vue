<template lang="pug">
  .qcw-comment-form

    i(class='qcw-icon')
      label
        input(class="uploader__input" name="file_all" type="file" @change="uploadFile")
        icon(name="ic-file-attachment" :fill="core.UI.colors.formMessageIconColor")
    i(class='qcw-icon')
      label
        input(class="uploader__input" name="file_image" type="file" accept="image/*" @change="uploadFile")
        icon(name="ic-image-attachment" :fill="core.UI.colors.formMessageIconColor")

    textarea(placeholder="Type your message"
      @keyup="typingHandler($event)"
      @keydown.enter="trySubmitComment($event)"
      :style="textareaStyle"
      v-model="commentInput")
    i(@click="trySubmitComment($event)")
      icon(name="ic-send-message" :fill="sendBtnStatus")
</template>

<script>
import { scrollIntoLastElement } from '../lib/utils';
import Icon from './Icon';

export default {
  name: 'CommentForm',
  components: { Icon },
  props: ['core', 'repliedComment', 'closeReplyHandler'],
  data() {
    return {
      commentInput: '',
      excludedEmoji: ['flags', 'objects', 'recent'],
      emojiSize: 16,
      sheetSize: 16,
      toggleEmoji: false,
      textareaStyle: {},
      emojione: (typeof emojione !== 'undefined') ? emojione : {},
    };
  },
  mounted() {
    this.textareaStyle = {
      color: this.core.UI.colors.formMessageTextColor,
    };
  },
  computed: {
    sendBtnStatus() {
      return this.commentInput.length > 0
        ? this.core.UI.colors.formMessageIconHoverColor
        : this.core.UI.colors.formMessageIconColor;
    },
    uploadedFiles() {
      if (!this.core.selected) return [];
      return this.core.uploadedFiles
        .filter(f => f.roomId === this.core.selected.id);
    },
  },
  methods: {
    // toggleEmojiPicker() {
    //   this.toggleEmoji = !this.toggleEmoji;
    // },
    // addEmoji(emoji) {
    //   this.commentInput = this.commentInput + emoji.native;
    // },
    trySubmitComment(e) {
      if (!e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        // this code is needed for emoji implementation, dirty, but works, need to refine later
        const selector = '.qcw-comment-form textarea';
        const element = document.querySelector(selector);
        this.commentInput = element.value;
        let message = this.commentInput.trim();
        if (typeof emojione !== 'undefined') message = emojione.shortnameToUnicode(message);
        if (this.commentInput.trim().length < 1) return;
        // this.$store.dispatch('setNewCommentText', '');
        this.commentInput = '';
        this.submitComment(this.core.selected.id, message);
        // this.commentFormHandler();
        // this.showActions = false;
        // this.setButtonColor('#979797');
      }
    },
    submitComment(topicId, comment) {
      if (this.repliedComment === null) {
        this.core.sendComment(topicId, comment).then(() => {
          scrollIntoLastElement(this.core);
        });
      } else {
        const payload = {
          text: comment,
          replied_comment_id: this.repliedComment.id,
          replied_comment_message: this.repliedComment.message,
          replied_comment_payload: null,
          replied_comment_sender_email: this.repliedComment.username_real,
          replied_comment_sender_username: this.repliedComment.username_as,
          replied_comment_type: this.repliedComment.type,
        };
        this.closeReplyHandler();
        this.core.sendComment(topicId, comment, null, 'reply', JSON.stringify(payload))
          .then(() => scrollIntoLastElement(this.core));
      }
    },
    typingHandler(event) {
      this.resizeCommentForm(event);
      this.publishTyping();
    },
    resizeCommentForm(event) {
      const treshold = 80;
      const textarea = event.currentTarget;
      const formContainerStyle = window.getComputedStyle(textarea.parentElement);
      const pt = parseInt(formContainerStyle.paddingTop, 10);
      const pb = parseInt(formContainerStyle.paddingBottom, 10);
      textarea.style.height = '26px';
      if (textarea.scrollHeight < treshold) {
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
        textarea.parentElement.style.flexBasis = `${textarea.scrollHeight + pt + pb + 2}px`;
      } else {
        textarea.style.overflowY = 'scroll';
        textarea.style.height = `${treshold}px`;
        textarea.parentElement.style.flexBasis = `${treshold + pt + pb + 2}px`;
      }
    },
    publishTyping() {
      const self = this;
      if (this.core.selected.isChannel) return;
      if (self.commentInput.length > 0) {
        self.core.realtimeAdapter.publishTyping(1);
      } else {
        self.core.realtimeAdapter.publishTyping(0);
      }
    },
    uploadFile(e) {
      const vm = this;
      const files    = e.target.files || e.dataTransfer.files;
      const formData = new FormData();
      const roomId   = this.core.selected.id;

      // check allowed file type
      // ambil dulu extensi file nya sebelumnya.
      // console.log(files);
      let ext = files[0].name.split('.');
      ext = ext[ext.length - 1] || null;
      if (this.core.allowedFileTypes && this.core.allowedFileTypes.indexOf(ext) < 0) {
        return vm.$toasted.error('File uploading failed');
      }

      // all clear, let's upload
      formData.append('file', files[0]);
      formData.append('token', vm.core.userData.token);
      vm.core.addUploadedFile(files[0].name, roomId);
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (uploadEvent) => {
        this.updateProgress(uploadEvent, files[0].name);
      });
      xhr.open('POST', `${vm.core.baseURL}/api/v2/sdk/upload`, true);
      xhr.setRequestHeader('qiscus_sdk_app_id', `${vm.core.AppId}`);
      xhr.setRequestHeader('qiscus_sdk_user_id', `${vm.core.user_id}`);
      xhr.setRequestHeader('qiscus_sdk_token', `${vm.core.userData.token}`);
      xhr.onload = function responseReceived() {
        if (xhr.status === 200) {
          // file(s) uploaded), let's post to comment
          const url = JSON.parse(xhr.response).results.file.url;
          const attachmentPayload = {
            url,
            caption: '',
            file_name: files[0].name,
          };
          vm.core.sendComment(roomId, `[file] ${url} [/file]`, null,
          'file_attachment', JSON.stringify(attachmentPayload))
            .then(() => {
              vm.core.removeUploadedFile(files[0].name, roomId);
              e.target.value = null;
              window.setTimeout(() => scrollIntoLastElement(vm.core), 0);
            });
        } else {
          vm.$toasted.error('File uploading failed');
          vm.core.removeUploadedFile(files[0].name, roomId);
        }
      };
      xhr.send(formData);
      return true;
    },
    updateProgress(e, fileName) {
      if (e.lengthComputable) {
        const percentComplete = e.loaded / e.total;
        const fileObject = this.uploadedFiles
          .find(f => f.name === fileName);
        if (fileObject) fileObject.progress = Math.round(percentComplete * 100);
        // console.log('%s', fileObject.progress);
      } else {
        console.log('unkown');
      }
    },
  },
};
</script>

<style lang="stylus">
  @import '../assets/stylus/_variables.styl'
  .qcw-comment-form
    display flex
    justify-content space-between
    padding 18px 8px
    position relative
    order 2
    transition all 0.05s ease-out

  .qcw-comment-form textarea
    border 0
    flex 1
    font-size 15px
    font-family "Open Sans", sans-serif
    line-height 150%
    max-height 100%
    height 26px
    resize none
    margin-left 8px
    &::-webkit-scrollbar-track
      border-radius: 10px;
      background-color: #fafafa;

    &::-webkit-scrollbar
      width: 8px;
      background-color: #fafafa;

    &::-webkit-scrollbar-thumb
      border-radius: 4px;
      background-color: #e0e0e0;
    &:focus
      border 0
      outline none

  .qcw-comment-form i
    display inline-block
    text-align center
    cursor pointer
    flex 0 20px
    padding 0 8px
    align-self center

    label
      cursor pointer

    input[type="file"]
      display none

    &.qcw-icon:hover svg.qc-icon
      fill $green
</style>
