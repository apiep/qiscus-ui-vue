<template lang="pug">
  div(class="reply-wrapper reply-wrapper--preview")
    div
      div(class="reply-sender") {{ comment.username_as }}
      image-loader(v-if="comment.isAttachment(comment.message)"
        :comment="comment"
        :message="comment.message"
        :on-click-image="void(0)"
        :callback="void(0)")
      
      //- comment-render(v-if="!comment.isAttachment(comment.message)" 
      //-   :text="textToRender")

      div(class="qcw-comment__content" 
        v-if="!comment.isAttachment(comment.message)") {{ textToRender }}

    i(@click="closeReplyHandler" class="reply-close-btn")
      icon(name="ic-close")
</template>

<script>
import ImageLoader from './ImageLoader';
import Icon from './Icon';
import CommentRender from './CommentRender';

export default {
  name: 'CommentReplyPreview',
  components: { ImageLoader, CommentRender, Icon },
  props: ['comment', 'closeReplyHandler'],
  computed: {
    textToRender() {
      return (this.comment.type !== 'reply')
        ? this.comment.message
        : this.comment.payload.text;
    },
  },
};
</script>
