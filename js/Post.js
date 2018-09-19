class Post {
    constructor(main) {
        this.init();
        this.main = main;
        this.blog = main.blog;
    }

    init() {
        let self = this;
        $('.publish-post').click(function (e) {
            e.preventDefault();
            let postContentElement = $('#postContent');
            let description = postContentElement.val();
            let attachments = [];
            let id = 1;
            $('.post-attachment').each(function (k, v) {
                let type = $(v).attr('data-type');
                let url = $(v).attr('data-url');
                if (type && url) {
                    attachments.push({
                        id: id,
                        type: type,
                        url: url
                    });
                    id++;
                }
            });
            let isContentExists = description.length || attachments.length;
            if (!isContentExists) {
                self.alert('Please, write text or add attachments');
                return;
            }

            let newPostId = self.blog.myProfile.last_post_id + 1;
            self.main.addPostByData({
                id: newPostId,
                description: description,
                attachments: attachments
            });
            $('#postBlock').addClass("disabled-content");
            self.blog.createPost(newPostId, description, attachments)
                .then(function (response) {
                    console.log(response.data);
                    postContentElement.val('');
                    $('#attached-content').html('');
                    self.main.onAfterHashChange(response.data, true);
                })
                .catch(function (error) {
                    console.log(error);
                    console.log('Some error happen');
                })
                .then(function () {
                    $('#postBlock').removeClass("disabled-content");
                });
        });

        $('#postBlock')
            .on('click', '.delete-post-attachment', function (e) {
                e.preventDefault();
                let url = $(this).attr('data-url');
                let type = $(this).attr('data-type');
                $('.post-attachment[data-url="' + url + '"]').hide('slow', function () {
                    $(this).remove();
                });
                if (type !== 'youtube') {
                    self.main.swarm.delete(url).then(function (response) {
                        self.main.onAfterHashChange(response.data, true);
                    });
                }
            });

        $('.attach-photo').click(function (e) {
            e.preventDefault();
            let input = $('#input-attach-file');
            input.attr('data-type', 'photo');
            input.attr('accept', 'image/*');
            input.click();
        });

        $('.attach-video').click(function (e) {
            e.preventDefault();
            let input = $('#input-attach-file');
            input.attr('data-type', 'video');
            input.attr('accept', 'video/*');
            input.click();
        });

        $('.attach-audio').click(function (e) {
            e.preventDefault();
            let input = $('#input-attach-file');
            input.attr('data-type', 'audio');
            input.attr('accept', 'audio/*');
            input.click();
        });

        $('#input-attach-file').on('change', function () {
            if (this.files && this.files[0]) {
                $('#postOrAttach').addClass("disabled-content");

                let progressPanel = $('#progressPanel');
                let postProgress = $('#postProgress');
                progressPanel.show();
                let fileType = $(this).attr('data-type');
                let setProgress = function (val) {
                    postProgress.css('width', val + '%').attr('aria-valuenow', val);
                };
                let updateProgress = function (progress) {
                    let onePercent = progress.total / 100;
                    let currentPercent = progress.loaded / onePercent;
                    setProgress(currentPercent);
                };

                let currentPostId = self.blog.myProfile.last_post_id + 1;
                let formData = new FormData();
                let lastName = null;
                let lastNameWithoutExtension = null;
                let lastBlob = null;
                let lastExtension = null;
                let timestamp = +new Date();
                let lastValue = null;
                $.each(this.files, function (key, value) {
                    lastValue = value;
                    let blob = value.slice(0, value.size, value.type);
                    lastBlob = blob;
                    let extension = value.name.split('.').pop();
                    lastNameWithoutExtension = timestamp + '_' + key;
                    lastName = lastNameWithoutExtension + '.' + extension;
                    lastExtension = extension;
                    let file = new File([blob], lastName, {type: value.type});
                    formData.append(key, file);
                });

                let afterUploadingFiles = function (data) {
                    console.log(data);
                    let url = data.url + lastName;
                    let fullUrl = data.fullUrl + lastName;
                    let postAttachmentTemplate = $('#postAttachment')
                        .clone()
                        .removeAttr('id')
                        .attr('style', '')
                        .attr('data-type', fileType)
                        .attr('data-url', url);
                    postAttachmentTemplate
                        .find('.content')
                        .html('<a href="#" class="delete-post-attachment" data-url="' + url + '" data-type="' + fileType + '"><img src="img/delete.png" alt=""></a> <a target="_blank" href="' + fullUrl + '">' + url + '</a>')
                    $('#attached-content').append(postAttachmentTemplate);
                    self.main.onAfterHashChange(data.response.data, true);
                    progressPanel.hide();
                    setProgress(0);
                    $('#postOrAttach').removeClass("disabled-content");
                };

                let beforeUploadingPhoto = function (file) {
                    console.log(file);
                    let url = Utils.getUrlForBlob(file);
                    let postAttachmentTemplate = $('#postAttachment')
                        .clone()
                        .removeAttr('id')
                        .attr('style', '')
                        .attr('data-name', file.name);
                    postAttachmentTemplate
                        .find('.content')
                        .html('<img class="img-preview" src="' + url + '">');
                    $('#attached-content').append(postAttachmentTemplate);
                };

                let afterUploadingPhoto = function (previewFile, originalFile, data) {
                    let previewUrl = Utils.getUrlForBlob(previewFile);
                    let originalUrl = data.fullUrl + originalFile.name;
                    let attachment = $('.post-attachment[data-name="' + previewFile.name + '"]');
                    attachment
                        .attr('data-type', fileType)
                        .attr('data-url', data.url + originalFile.name)
                        .attr('data-preview-url', data.url + previewFile.name);
                    attachment.find('.content').html('<a target="_blank" href="' + originalUrl + '"><img class="img-preview" src="' + previewUrl + '"></a>');
                    setProgress(0);
                    $('#postOrAttach').removeClass("disabled-content");
                    self.main.onAfterHashChange(data.response.data, true);
                };

                if (fileType === 'photo') {
                    Utils.resizeImages(lastBlob, [{width: 250, height: 250}])
                        .then(function (result) {
                            let key = '250x250';
                            let imagePreview = result[key];
                            let previewFilename = lastNameWithoutExtension + '_' + key + '.' + lastExtension;
                            let file = new File([imagePreview], previewFilename, {type: lastValue.type});
                            beforeUploadingPhoto(file);
                            // todo change key for multiple
                            formData.append(1, file);
                            // todo show image preview
                            self.blog.uploadFilesForPost(currentPostId, formData, updateProgress)
                                .then(function (data) {
                                    afterUploadingPhoto(file, formData.get(0), data);
                                });
                        });
                } else {
                    self.blog.uploadFilesForPost(currentPostId, formData, updateProgress)
                        .then(function (data) {
                            afterUploadingFiles(data);
                        });
                }
            }
        });

        $('.add-youtube-video').click(function (e) {
            //e.preventDefault();
            let url = $('#youtubeUrl').val();
            if (url) {
                $('#attachYoutubeModal').modal('hide');
                let postAttachmentTemplate = $('#postAttachment')
                    .clone()
                    .removeAttr('id')
                    .attr('style', '')
                    .attr('data-type', 'youtube')
                    .attr('data-url', url);
                postAttachmentTemplate
                    .find('.content')
                    .html('<a href="#" class="delete-post-attachment" data-url="' + url + '" data-type="youtube"><img src="img/delete.png" alt=""></a> <a target="_blank" href="' + url + '">' + url + '</a>');
                $('#attached-content').append(postAttachmentTemplate);
            } else {
                self.alert('Please, enter url');
            }
        });

        $('#userPosts')
            .on('click', '.delete-post', function (e) {
                e.preventDefault();
                let id = $(this).attr('data-id');
                if (confirm('Really delete?')) {
                    //$('#my-post').addClass("disabled-content");
                    $('#userPost' + id).hide('slow');
                    self.blog.deletePost(id)
                        .then(function (response) {
                            self.main.onAfterHashChange(response.data, true);
                        });
                }
            })
            .on('click', '.edit-post', function (e) {
                e.preventDefault();
                let id = $(this).attr('data-id');
                $('#userPost' + id + ' .description').toggle();
                $('#userPost' + id + ' .edit-post-block').toggle();
            })
            .on('click', '.save-post', function (e) {
                e.preventDefault();
                let id = $(this).attr('data-id');
                let description = $(this).closest('.edit-post-block').find('textarea').val();
                $('#userPost' + id + ' .description').text(description).toggle();
                $('#userPost' + id + ' .edit-post-block').toggle();
                self.blog.editPost(id, description).then(function (response) {
                    self.main.onAfterHashChange(response.data, true);
                });
            });
    }
}

module.exports = Post;