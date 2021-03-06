const should = require('should'),
    sinon = require('sinon'),
    helpers = require('../../../../server/helpers/register'),
    filters = require('../../../../server/filters'),
    AppProxy = require('../../../../server/services/apps/proxy'),
    routing = require('../../../../server/services/routing');

describe('Apps', function () {
    var fakeApi;

    beforeEach(function () {
        fakeApi = {
            posts: {
                browse: sinon.stub(),
                read: sinon.stub(),
                edit: sinon.stub(),
                add: sinon.stub(),
                destroy: sinon.stub()
            },
            users: {
                browse: sinon.stub(),
                read: sinon.stub(),
                edit: sinon.stub()
            },
            tags: {
                all: sinon.stub()
            },
            notifications: {
                destroy: sinon.stub(),
                add: sinon.stub()
            },
            settings: {
                browse: sinon.stub(),
                read: sinon.stub(),
                add: sinon.stub()
            }
        };

        sinon.stub(routing.registry, 'getRouter').withArgs('appRouter').returns({
            mountRouter: sinon.stub()
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Proxy', function () {
        it('requires a name to be passed', function () {
            function makeWithoutName() {
                return new AppProxy({});
            }

            makeWithoutName.should.throw('Must provide an app name for api context');
        });

        it('requires permissions to be passed', function () {
            function makeWithoutPerms() {
                return new AppProxy({
                    name: 'NoPerms'
                });
            }

            makeWithoutPerms.should.throw('Must provide app permissions');
        });

        it('creates a ghost proxy', function () {
            var appProxy = new AppProxy({
                name: 'TestApp',
                permissions: {
                    filters: ['prePostRender'],
                    helpers: ['myTestHelper'],
                    posts: ['browse', 'read', 'edit', 'add', 'delete']
                }
            });

            should.exist(appProxy.filters);
            should.exist(appProxy.filters.register);
            should.exist(appProxy.filters.deregister);

            should.exist(appProxy.helpers);
            should.exist(appProxy.helpers.register);
            should.exist(appProxy.helpers.registerAsync);

            should.exist(appProxy.api);

            should.exist(appProxy.api.posts);
            should.exist(appProxy.api.posts.browse);
            should.exist(appProxy.api.posts.read);
            should.exist(appProxy.api.posts.edit);
            should.exist(appProxy.api.posts.add);
            should.exist(appProxy.api.posts.destroy);

            should.not.exist(appProxy.api.users);

            should.exist(appProxy.api.tags);
            should.exist(appProxy.api.tags.browse);

            should.exist(appProxy.api.notifications);
            should.exist(appProxy.api.notifications.browse);
            should.exist(appProxy.api.notifications.add);
            should.exist(appProxy.api.notifications.destroy);

            should.exist(appProxy.api.settings);
            should.exist(appProxy.api.settings.browse);
            should.exist(appProxy.api.settings.read);
            should.exist(appProxy.api.settings.edit);
        });

        it('allows filter registration with permission', function (done) {
            var registerSpy = sinon.spy(filters, 'registerFilter'),
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {
                        filters: ['testFilter'],
                        helpers: ['myTestHelper'],
                        posts: ['browse', 'read', 'edit', 'add', 'delete']
                    }
                }),
                fakePosts = [{id: 0}, {id: 1}],
                filterStub = sinon.spy(function (val) {
                    return val;
                });

            appProxy.filters.register('testFilter', 5, filterStub);

            registerSpy.called.should.equal(true);

            filterStub.called.should.equal(false);

            filters.doFilter('testFilter', fakePosts)
                .then(function () {
                    filterStub.called.should.equal(true);
                    appProxy.filters.deregister('testFilter', 5, filterStub);
                    done();
                })
                .catch(done);
        });

        it('does not allow filter registration without permission', function () {
            var registerSpy = sinon.spy(filters, 'registerFilter'),
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {
                        filters: ['prePostRender'],
                        helpers: ['myTestHelper'],
                        posts: ['browse', 'read', 'edit', 'add', 'delete']
                    }
                }),
                filterStub = sinon.stub().returns('test result');

            function registerFilterWithoutPermission() {
                appProxy.filters.register('superSecretFilter', 5, filterStub);
            }

            registerFilterWithoutPermission.should.throw('The App "TestApp" attempted to perform an action or access' +
                ' a resource (filters.superSecretFilter) without permission.');

            registerSpy.called.should.equal(false);
        });

        it('allows filter deregistration with permission', function (done) {
            var registerSpy = sinon.spy(filters, 'deregisterFilter'),
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {
                        filters: ['prePostsRender'],
                        helpers: ['myTestHelper'],
                        posts: ['browse', 'read', 'edit', 'add', 'delete']
                    }
                }),
                fakePosts = [{id: 0}, {id: 1}],
                filterStub = sinon.stub().returns(fakePosts);

            appProxy.filters.deregister('prePostsRender', 5, filterStub);

            registerSpy.called.should.equal(true);

            filterStub.called.should.equal(false);

            filters.doFilter('prePostsRender', fakePosts)
                .then(function () {
                    filterStub.called.should.equal(false);
                    done();
                })
                .catch(done);
        });

        it('does not allow filter deregistration without permission', function () {
            var registerSpy = sinon.spy(filters, 'deregisterFilter'),
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {
                        filters: ['prePostRender'],
                        helpers: ['myTestHelper'],
                        posts: ['browse', 'read', 'edit', 'add', 'delete']
                    }
                }),
                filterStub = sinon.stub().returns('test result');

            function deregisterFilterWithoutPermission() {
                appProxy.filters.deregister('superSecretFilter', 5, filterStub);
            }

            deregisterFilterWithoutPermission.should.throw('The App "TestApp" attempted to perform an action or ' +
                'access a resource (filters.superSecretFilter) without permission.');

            registerSpy.called.should.equal(false);
        });

        it('allows helper registration with permission', function () {
            var registerSpy = sinon.stub(helpers, 'registerThemeHelper'),
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {
                        filters: ['prePostRender'],
                        helpers: ['myTestHelper'],
                        posts: ['browse', 'read', 'edit', 'add', 'delete']
                    }
                });

            appProxy.helpers.register('myTestHelper', sinon.stub().returns('test result'));

            registerSpy.called.should.equal(true);
        });

        it('does not allow helper registration without permission', function () {
            var registerSpy = sinon.stub(helpers, 'registerThemeHelper'),
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {
                        filters: ['prePostRender'],
                        helpers: ['myTestHelper'],
                        posts: ['browse', 'read', 'edit', 'add', 'delete']
                    }
                });

            function registerWithoutPermissions() {
                appProxy.helpers.register('otherHelper', sinon.stub().returns('test result'));
            }

            registerWithoutPermissions.should.throw('The App "TestApp" attempted to perform an action or access a ' +
                'resource (helpers.otherHelper) without permission.');

            registerSpy.called.should.equal(false);
        });

        it('does allow INTERNAL app to register helper without permission', function () {
            var registerSpy = sinon.stub(helpers, 'registerThemeHelper'),
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {},
                    internal: true
                });

            function registerWithoutPermissions() {
                appProxy.helpers.register('otherHelper', sinon.stub().returns('test result'));
            }

            registerWithoutPermissions.should.not.throw('The App "TestApp" attempted to perform an action or access a ' +
                'resource (helpers.otherHelper) without permission.');

            registerSpy.called.should.equal(true);
        });
    });
});
