# Consent Block
Consent block provides a minimalistic, performant and non-intrusive cookie consent banner.

## The basics

* This block displays a minimalistic non-intrusive cookie consent banner
* Pages where cookie consent banner needs to be shown, must have a metadata property called `cookie-consent`, specifying the name of the cookie consent banner we want to show.
* The content of the cookie consent banner is in a separate document normally in the path `/cookie-consent/<name-of-the-consent-banner>`
* When a user selects their consent preferences, they are stored in the local storage.
* The banner is only shown on page load if a user doesn't have preferences in the local storage.
* When consent preferences are updated or read from the browser, a custom event is triggered. Martech loaders can listen to this events to decide what to load or not load, based on user preferences.

## Cookie Consent Flow
![Cookie Consent flow](https://github.com/adobe/aem-block-collection/assets/43381734/53583ee0-da46-4f1a-91f4-39411305bf47)


## Content of the banner
We offer 2 possibilities:

### 1. Simple consent banner
One simple text explaining that the website is using cookies. Buttons `accept all`, `deny all` can be added optionally.

*Word document*:
Contains a single section with the text, which can be styled, and metadata.

Metadata properties:
* `required cookies`: List of cookie category codes that will be always active, regardless of what the user selects.
* `optional categories`: List of cookie category codes that are optional, that will only be active if the user explicitly consents, by clicking `accept all` button.
* `buttons`: comma-separated list. accepted values: `accept-all` , `deny-all`

*Samples*:
* configuration:

![Consent configuration](https://github.com/adobe/aem-block-collection/assets/43381734/e8e52be7-1cf5-4820-8384-76ff228be061)

* banner displayed:

![Consent banner preview](https://github.com/adobe/aem-block-collection/assets/43381734/7b70dfe8-1d79-432e-8e74-f09af016bab7)



### 2. Simple consent banner and categories details
Shows the simple consent banner as the previous one, but also offers a dialog which displays detailed information of each of the categories of cookies the website uses, and allows users to select individually each category.
By default only the minimalistic consent banner is shown, but users can click a "more information" button that will display the dialog.

*Word document*:
* First section has the content of the simple content banner.
In this case the only allowed metadata property is:
`buttons` = `accept_all | reject_all | more_info`

* The second and subsequent sections are only used in the detailed categories dialog.
It expects a first intro section with some explanation text that is displayed on top of the dialog.
The second and subsequent sections are considered to be cookie categories. And each of them need 2 metadata properties:
`code` = code of the category that will be used by martech loaders
`optional` = whether the category is optional or not.

*Samples*
* configuration

![Multiple consent configuration samples](https://github.com/adobe/aem-block-collection/assets/43381734/1fba9fcf-19a8-4f0d-9e3d-741e77befefb)


* dialog displayed

![Consent dialog preview](https://github.com/adobe/aem-block-collection/assets/43381734/72929596-0b25-450a-9332-72dea6d94204)

## Update consent
Sometimes users want to change their cookie preferences. For this purpose there is a function in the block `blocks/consent/consent.js` called `showConsentForUpdate(name)`.
Where `name` is the name of the consent configuration document. This function is expected to be called when a user clicks on the "cookie preferences" or similar link.

* In case of *#1. Simple consent banner* this function will show the minimalistic non-intrusive banner
* In case of *#2. Simple consent banner and categories details* this function would show the consent categories detail dialog.

## Block setup

Block needs to be loaded as quickly as possible and the logic to load the block or not highly depends on project needs. Here are the two elements you may want to patch in your project:

- in [scripts.js](../../scripts.js), you need to load the consent block in the lazy phase to load the consent banner
- in [footer](../header/footer.js), you can "patch" the Cookie Preferences link to open the consent dialog using the `setupConsentPreferenceLink` function from the block.
