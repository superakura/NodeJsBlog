var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, title, tags, post) {
    this.name = name;
    this.title = title;
    this.tags = tags;
    this.post = post;
}

module.exports = Post;

Post.prototype.save = function(callback) {
    var date = new Date();
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + '-' + date.getMonth(),
        day: date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate(),
        minute: date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + ' ' +
            date.getHours() + ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    }

    var post = {
        name: this.name,
        time: time,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments: [],
        pv: 0
    };
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.insert(post, { safe: true }, function(err, user) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Post.getByPage = function(name, page, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //使用count返回特定查询的文档数total
            collection.count(query, function(err, total) {
                collection.find(query, {
                    skip: (page - 1) * 5,
                    limit: 5
                }).sort({ time: -1 }).toArray(function(err, docs) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    //解析markdown为html
                    docs.forEach(function(doc) {
                        doc.post = markdown.toHTML(doc.post);
                    });
                    callback(null, docs, total);
                });
            });
        });
    });
};

Post.getOne = function(name, day, title, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function(err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                if (doc) {
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {
                        $inc: { "pv": 1 }
                    }, function(err) {
                        mongodb.close();
                        if (err) {
                            return callback(err);
                        }
                    });
                    doc.post = markdown.toHTML(doc.post);
                    doc.comments.forEach(function(comment) {
                        comment.content = markdown.toHTML(comment.content);
                    });
                    callback(null, doc);
                }
            });
        });
    });
};

Post.edit = function(name, day, title, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function(err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, doc);
            });
        });
    });
};

Post.update = function(name, day, title, post, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.update({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                $set: { post: post }
            }, function(err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Post.remove = function(name, day, title, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.remove({
                "name": name,
                "time.day": day,
                "title": title,
            }, {
                w: 1
            }, function(err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Post.getArchive = function(callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.find({}, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({ time: -1 }).toArray(function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

Post.getTags = function(callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //distinct,用来找出给定键的所有不同值
            collection.distinct("tags", function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

Post.getTag = function(tag, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //distinct,用来找出给定键的所有不同值
            collection.find({
                "tags": tag
            }, {
                "name": 1,
                "time": 1,
                "title": 1,
            }).sort({ time: -1 }).toArray(function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};