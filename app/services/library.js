import Ember from 'ember';
import _ from 'lodash';
import config from 'cloud-amp/config/environment';

export default Ember.Service.extend({
  mediaResource: Ember.inject.service('media-resource'),
  libraries    : null,
  library      : null,
  allLibraries : [
    'google',
    'cloudamp'
  ],
  init() {
    this.set('libraries', {});
  },
  setCachedLibrary(name, library) {
    this.set('libraries.' + name, library);
  },
  loadLibrary(name) {
    var lib = this.getCachedLibrary(name);
    if (lib) {
      this.setCurrentLibrary(name);
    } else {
      this.getLibrary(name).then(() => this.setCurrentLibrary(name));
    }
  },
  getCachedLibrary(name) {
    return this.get('libraries.' + name);
  },
  setCurrentLibrary(name) {
    this.set('library', this.getCachedLibrary(name));
  },
  getLibrary(source) {
    var media = this.get('mediaResource');
    if (source === 'all') {
      return this.mergeLibraries(_.map(this.allLibraries, lib => {
        return this.getCachedLibrary(lib);
      })).then(lib => this.setCachedLibrary('all', lib));
    } else {
      var library = this.getCachedLibrary(source);
      if (library) {
        return new Ember.RSVP.Promise(r => r(library));
      }
      if (media.hasToken(source)) {
        return this.fetchLibrary(source);
      }
    }
  },
  fetchLibrary(source) {
    var media = this.get('mediaResource');
    return media.getLibrary(source)
      .then(l => {
        this.wireUpRelations(l, source);
        this.setCachedLibrary(source, l);
        return l;
      });
  },
  getStreamUrl(source, id) {
    return this.get('mediaResource').getStreamUrl(source, id);
  },
  incrementPlayCount(source, id) {
    return this.get('mediaResource').incrementPlayCount(source, id);
  },
  mergeLibraries(libraries) {
    return new Ember.RSVP.Promise(r => {
      var artists = _.filter(_.flatten(_.map(libraries, library => {
        if (library) {
          return library.artists;
        }
      })), n => !_.isUndefined(n));
      r({
        artists     : artists,
        artistsCount: artists.length
      });
    });
  },
  /**
   * We would like that each artist and track point to their respective owners,
   * so we can easily climb back up the stack
   */
  wireUpRelations(library, name) {
    _.forEach(library.artists, artist => {
      _.forEach(artist.albums, album => {
        album.artist = artist;
        _.forEach(album.tracks, track => {
          track.album  = album;
          track.artist = artist;
          track.source = name;
        });
      });
    });
    return library;
  }
});
