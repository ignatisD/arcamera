(function () {

    const cardContainer = document.body.querySelector('.container');
    function addEventListeners() {
        const { Events } = window.PerceptionToolkit;
        // alert(JSON.stringify(window.PerceptionToolkit.Events, null, 2));
        window.addEventListener(Events.MarkerChanges, onPerceivedResults);
        // Fires the if the user denies camera access.
        window.addEventListener(Events.CameraAccessDenied, onCameraAccessDenied);
        // Fires the if the device does not have the required APIs.
        window.addEventListener(Events.DeviceNotSupported, onDeviceNotSupported);
        window.addEventListener("pt.markerdetect", onMarkerDetect);

        document.getElementById('test').addEventListener("click", showCard);
    }

    function onPerceivedResults(evt) {
        const { Elements } = window.PerceptionToolkit;
        // Take control of the UI rendering.
        evt.preventDefault();
        const { found, lost } = evt.detail;

        // alert(JSON.stringify(evt.detail, null, 2));
        // First, automatically remove any "not recognized" cards if we now have content.
        if (found.length !== 0) {
            const notRecognizedCard = cardContainer.querySelector('[data-not-recognized]');
            if (notRecognizedCard) {
                notRecognizedCard.remove();
            }
        }
        // ...If we still have any cards on screen, leave them there.
        // Note: Alternatively, could create a carousel of results.
        if (cardContainer.childNodes.length > 0) {
            return;
        }
        // If this is an unrecognized result.  Let's create an "error" card.
        if (found.length === 0 && lost.length === 0) {
            /*
             * Dig In here.  Customize what to do in case of error!
             */
            const card = new Elements.Card();
            card.src = 'Sorry, this item was not recognized.';
            card.dataset.notRecognized = true;
            cardContainer.appendChild(card);
            return;
        }

        // If this is a new result, show a custom card, in order to create a share button.
        if (found.length > 0) {
            const card = getCard(found[0].content);
            cardContainer.appendChild(card);

            const button = new Elements.ActionButton();
            button.label = 'Share';
            button.addEventListener('click', () => {
                webShare(card.src)
                    .then(function (result) {
                        result && card.close();
                    });
            });
            card.appendChild(button);

            const button2 = new Elements.ActionButton();
            button2.label = 'Go';
            button2.addEventListener('click', () => {
                window.open(card.src.url);
                card.close();
            });
            card.appendChild(button2);
            return;
        }
    }
    function onDeviceNotSupported() {
        alert('Device Not Supported');
    }
    function onCameraAccessDenied() {
        const { Elements } = window.PerceptionToolkit;
        const card = new Elements.Card();
        card.src = 'Camera unavailable or access denied';
        cardContainer.appendChild(card);
    }

    function onMarkerDetect(evt) {
        const { Elements } = window.PerceptionToolkit;
        // Take control of the UI rendering.
        evt.preventDefault();
        if (cardContainer.childNodes.length > 0) {
            return;
        }
        const detail = evt.detail;
        let card;
        try {
            if (/^https?/.test(detail)) {
                card = getCard(new URL(detail));
                const button2 = new Elements.ActionButton();
                button2.label = 'Go';
                button2.addEventListener('click', () => {
                    window.open(card.src.url);
                    card.close();
                });
                card.appendChild(button2);
            } else {
                card = getCard(detail);
            }
            card.dataset.notRecognized = true;
            cardContainer.appendChild(card);
        } catch (e) {
            alert(e.message);
        }
    }

    function showCard(evt) {
        evt.preventDefault && evt.preventDefault();
        const card = getCard({
            name: "WebChat",
            description: "WebChat is a simple chat application for web and mobile alike.",
            image: "https://webchat.gr/images/webchat@2x.png",
            price: {
                value: "50.00",
                currency: "EUR"
            },
            url: "https://webchat.gr/"
        });
        card.dataset.notRecognized = true;
        cardContainer.appendChild(card);
    }

    function webShare (content) {
        if (!('share' in navigator)) {
            console.warn("Share not supported");
            return Promise.resolve(false);
        }
        let shareOpts = {
            title: "Take a look at this",
            text: "",
            url: ""
        };
        if (typeof content === "string") {
            shareOpts.title = content;
        } else if (content && content.url) {
            shareOpts.title = content.name;
            shareOpts.text = content.description;
            shareOpts.url = content.url;
        } else if (content && content.href) {
            shareOpts.url = content.url;
        } else {
            return Promise.resolve(false);
        }
        return navigator.share(shareOpts)
            .then(function (e) {
                console.log('👍', e);
                return true;
            }).catch(function (err) {
                console.error('👎', err);
                return false;
            });
    }

    function getCard(content) {
        const { Elements } = window.PerceptionToolkit;
        const maxWidth = document.documentElement.clientWidth;
        const maxHeight = document.documentElement.clientHeight;
        let width = 500;
        let height = 500;
        if (maxWidth < 500) {
            width = maxWidth;
        }
        if (maxHeight < 500) {
            height = maxHeight;
        }
        const card = new Elements.Card();
        if (typeof content === 'object' && typeof content.href !== 'undefined') {
            card.sandboxAttribute = "allow-top-navigation " +
                "allow-scripts " +
                "allow-same-origin " +
                "allow-popups " +
                "allow-pointer-lock " +
                "allow-forms";
            card.height = height;
        }
        card.src = content;
        card.width = width;
        return card;
    }

    function start() {
        const { Functions } = window.PerceptionToolkit;
        return Functions.initializeExperience();
    }

    async function init() {
        const onboarded = await idbKeyval.get('onboarded');
        if (!onboarded) {
            // Store for next time.
            await idbKeyval.set('onboarded', true);
        }
        // Config - place above the previous script element.
        window.PerceptionToolkit = window.PerceptionToolkit || {};
        window.PerceptionToolkit.config = {
            // The location of the installed toolkit.
            root: '/node_modules/perception-toolkit',

            // The element used to launch the experience.
            button: document.getElementById('get-started'),
            cardContainer: cardContainer,
            // Whether to show the onboarding flow. Note that this is superseded
            // internally by a flag
            onboarding: !onboarded,
            // Which images to show in carousel during onboarding
            onboardingImages: [
                '/assets/img/step1.jpg',
                '/assets/img/step2.jpg',
                '/assets/img/step3.jpg'
            ],
            sitemapUrl: ["/assets/mymap.jsonld"],
            showLoaderDuringBoot: false,
            onload: function () {
                addEventListeners();
            }
        };

        // Embed the toolkit.
        const toolkit = document.createElement('script');
        toolkit.src = '/node_modules/perception-toolkit/lib/bundled/bootstrap.js';
        document.head.appendChild(toolkit);
    }
    init();

})();