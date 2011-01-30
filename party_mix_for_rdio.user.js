// ==UserScript==
// @name         Party Mix for Rdio
// @namespace    http://sitr.us/
// @description  Adds an "Add 25 random songs to Queue" button on the Rdio Collection view.
// @include      http://www.rdio.com/*
// ==/UserScript==

var sitrus = function($) {
    var exports = {}
      , currentUser;

    // Rdio views are loaded via ajax.  We can use the ajaxComplete event as a
    // cue to check see if the Collection view has just been loaded.
    $(document).bind('ajaxComplete', function() {
        displayPartyMixButton();
    });

    function displayPartyMixButton() {
        if ($('#party_mix').length < 1 && $('#collection_container').length > 0) {
            var partyMixDiv = $('<div id="party_mix" class="rdio-station"></div>').css({
                'position': 'relative',
                'bottom': '3px',
                'right': '8px'
            });

            var partyMixButton = $('<button class="button default_button" id="party_mix">Queue Random Songs</button>');
            partyMixDiv.append(partyMixButton);

            partyMixButton.click(function() {
                queueRandom(25);
            });

            $('#collection_header').append(partyMixDiv);
        }
    }

    // Adds n random songs from your collection to the queue.
    function queueRandom(n) {
        getArtistsInCollection(function(artists) {
            for (var i = 0; i < n; i += 1) {
                getRandomSongBy(randomMember(artists), addToQueue);
            }
        });
    }

    // Creates a playlist containing all of the songs in your collection.
    function collectionShuffle() {
        var name = 'collection shuffle '+ new Date();

        getSongsInCollection(function(songs) {
            createPlaylist(name, songs[0], function(isSuccess) {
                getPlaylist(name, function(playlist) {
                    songs.slice(1).forEach(function(song) {
                        addToPlaylist(playlist, song, function() {});
                    });
                });
            });
        });
    }

    function randomMember(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function getRandomSongBy(artist, callback) {
        getSongsForArtistInCollection(artist, function(songsByArtist) {
            callback(randomMember(songsByArtist));
        });
    }

    function getCollectionURL() {
        return $('#header a:contains(Collection)').attr('href');
    }

    function getCollection(callback) {
        $.getJSON(getCollectionURL(), callback);
    }

    function getCurrentUser(callback) {
        if (currentUser) {
            callback(currentUser);
        } else {
            getCollection(function(collection) {
                currentUser = collection.content.content.data.puser;
                callback(currentUser);
            });
        }
    }

    function getPlaylists(callback) {
        getCollection(function(collection) {
            $.getJSON(collection.content.content.data.urls.playlists, callback);
        });
    }

    function getPlaylist(name, callback) {
        getPlaylists(function(playlists) {
            var lists = playlists.content.content.data.playlists;

            callback(lists.filter(function(list) {
                return list.name === name;
            })[0]);
        });
    }

    function createPlaylist(name, song, description, callback) {
        if (typeof description == 'function') {
            callback = description;
            description = null;
        }

        $.post('/api/json/createPlaylist/', {
            name: name,
            song: song.id || song,
            description: description || 'automatically generated playlist'
        }, function(isSuccess) {
            callback(isSuccess);
        }, 'json');
    }

    function addToPlaylist(playlist, song, callback) {
        $.getJSON('/api/json/addToPlaylist/', {
            id: playlist.id || playlist,
            song: song.id || song
        }, function(isSuccess) {
            callback(isSuccess);
        });
    }

    function addToQueue(song) {
        getPlayer()._queueSource({
            type: song.type || 't',
            id: song.id || song
        });
    }

    function getArtistsInCollection(callback) {
        getCurrentUser(function(user) {
            $.getJSON('/api/json/getArtistsInCollection/', { uid: user.id }, callback);
        });
    }

    function getSongsForArtistInCollection(artist, callback) {
        getCurrentUser(function(user) {
            $.getJSON('/api/json/getSongsForArtistInCollection/', {
                id: artist.id || artist, uid: user.id
            }, callback);
        });
    }

    function getSongsInCollection(callback) {
        getArtistsInCollection(function(artists) {
            var syncCount = artists.length
              , songs = [];

            artists.forEach(function(artist) {
                getSongsForArtistInCollection(artist, function(songsByArtist) {
                    songs.push.apply(songs, songsByArtist);
                    syncCount -= 1;

                    if (syncCount === 0) {
                        callback(songs);
                    }
                });
            });
        });
    }

    exports.displayPartyMixButton          = displayPartyMixButton;
    exports.queueRandom                    = queueRandom;
    exports.collectionShuffle              = collectionShuffle;
    exports.getCollectionURL               = getCollectionURL;
    exports.getCollection                  = getCollection;
    exports.getCurrentUser                 = getCurrentUser;
    exports.getPlaylists                   = getPlaylists;
    exports.getPlaylist                    = getPlaylist;
    exports.createPlaylist                 = createPlaylist;
    exports.addToPlaylist                  = addToPlaylist;
    exports.addToQueue                     = addToQueue;
    exports.getArtistsInCollection         = getArtistsInCollection;
    exports.getSongsForArtistInCollection  = getSongsForArtistInCollection;
    exports.getSongsInCollection           = getSongsInCollection;

    return exports;
};

(function() {
    // Inject script so that in will run in the same context as other scripts
    // on the page.
    var s = document.createElement('script');
    s.innerHTML = 'sitrus = ('+ sitrus.toString() +')(jQuery);';
    document.body.appendChild(s);
})();
