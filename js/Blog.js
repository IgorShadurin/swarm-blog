class Blog {
    constructor(swarm) {
        this.swarm = swarm;
        this.version = 1;
    }

    getMyProfile() {
        return this.swarm.get('profile.json');
    }

    setMyProfile(data) {
        this.myProfile = data;
    }

    saveProfile(data, userHash) {
        data.version = this.version;
        return this.swarm.post("profile.json", JSON.stringify(data), 'application/json', userHash);
    }

    getProfile(userHash) {
        return this.swarm.get('profile.json', userHash);
    }

    sendRawFile(fileName, data, fileType, userHash, swarmProtocol) {
        return this.swarm.post(fileName, data, fileType, userHash, swarmProtocol);
    }

    uploadFileForPost(id, fileContent, contentType, fileName) {
        // structure
        // post/ID/file/[timestamp].[extension]
        let self = this;
        let extension = fileName.split('.').pop();
        let timestamp = +new Date();
        let url = "post/" + id + "/file/" + timestamp + "." + extension;

        return this.sendRawFile(url, fileContent, contentType).then(function (response) {
                return {
                    response: response,
                    url: url,
                    fullUrl: self.swarm.getFullUrl(url, response.data)
                };
            }
        );
    }

    uploadAvatar(fileContent) {
        // structure
        // file/avatar/original.jpg
        let self = this;
        let url = "file/avatar/original.jpg";

        return this.sendRawFile(url, fileContent, 'image/jpeg')
            .then(function (response) {
                console.log('avatar uploaded');
                console.log(response.data);
                swarm.applicationHash = response.data;
                self.myProfile.photo = {
                    original: url
                };

                return self.saveProfile(self.myProfile);
            });
    }

    createPost(id, text, attachments) {
        let self = this;
        // structure
        // /post/ID/info.json - {"id":id, "description":"my super post", "attachments":[]}
        attachments = attachments || [];
        let info = {
            id: id,
            description: text,
            attachments: attachments
        };

        return this.sendRawFile("post/" + id + "/info.json", JSON.stringify(info), 'application/json')
            .then(function (response) {
                console.log('one');
                console.log(response.data);
                self.myProfile.last_post_id = id;

                // todo change with saveProfile
                return self.sendRawFile("profile.json", JSON.stringify(self.myProfile), 'application/json', response.data);
            });
    }

    getPost(id, userHash) {
        return this.swarm.get('post/' + id + '/info.json', userHash);
    }

    deletePost(id) {
        return this.swarm.post("post/" + id + "/info.json", JSON.stringify({
            id: id,
            is_deleted: true
        }), 'application/json');
    }
}