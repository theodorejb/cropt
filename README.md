# Croppie - A Javascript Image Cropper


## To Install

Npm: `npm install croppie`

Download:
[croppie.js](croppie.js) & [croppie.css](croppie.css)

## Adding croppie to your site
```html
<link rel="stylesheet" href="croppie.css" />
<script src="croppie.js"></script>
```

## CDN
cdnjs.com provides croppie via cdn https://cdnjs.com/libraries/croppie
```
https://cdnjs.cloudflare.com/ajax/libs/croppie/{version}/croppie.min.css
https://cdnjs.cloudflare.com/ajax/libs/croppie/{version}/croppie.min.js
```

## Documentation
[Documentation](http://foliotek.github.io/Croppie#documentation)

#### Releasing a new version
For the most part, you shouldn't worry about these steps unless you're the one handling the release.  Please don't bump the release and don't minify/uglify in a PR.  That just creates merge conflicts when merging.  Those steps will be performed when the release is created.
1. Bump version in croppie.js
2. Minify/Uglify
3. Commit
4. npm version [new version]
5. `git push && git push --tags`
6. `npm publish`
7. Draft a new release with new tag on https://github.com/Foliotek/Croppie/releases
8. Deploy to gh-pages `npm run deploy`
