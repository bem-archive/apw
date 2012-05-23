.PHONY: all
all:

.PHONY: test
test:
	node_modules/.bin/mocha

.PHONY: lib-cov
lib-cov:
	-rm -rf lib-cov
	node_modules/visionmedia-jscoverage/jscoverage lib lib-cov

.PHONY: test-cover
test-cover: lib-cov test
	COVER=1 node_modules/.bin/mocha --reporter html-cov > coverage.html
	@echo
	@echo Open ./coverage.html file in your browser
