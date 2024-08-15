
document.getElementById('signInButton').onclick = () => {
    try {
        console.log("IN sign in button")
        window.electronAPI.goAuthPage();

        const message = document.createElement('p');
        message.textContent = 'A browser was opened for you';
        message.className = 'success-message';

        // Insert the message after the buttons but before the footer
        const container = document.querySelector('.container');
        const footer = document.querySelector('.footer');
        container.insertBefore(message, footer);
    } catch (error) {
        console.log("LOGIN.js error:",error)

    }
};

document.getElementById('createAccountButton').onclick = async () => {
    try {
        console.log("IN create account button")

        window.electronAPI.goAuthUrl();

        const message = document.createElement('p');
        message.textContent = 'A browser was opened for you';
        message.className = 'success-message';

        // Insert the message after the buttons but before the footer
        const container = document.querySelector('.container');
        const footer = document.querySelector('.footer');
        container.insertBefore(message, footer);

    } catch (error) {
        console.log("LOGIN.js error:",error)
    }
};