window.onload = function () {
  const introLines = [
    "Hello, my name is Aurélien and I am a software engineer.",
    "I have over 6 years of experience in the field and have worked on a variety of projects. ",
    "As a software engineer, I can help you with your software projects by developing high-quality code, solving complex problems, providing technical guidance, and ensuring information security.  ",
  ];
  const text = introLines.join(" ");
  console.log(text);
  let index = 0;
  let lineIndex = 0;
  const lineLengths = introLines.map((str) => str.length); // The number of characters in each line
  const delay = 8; // The delay between each character being displayed, in milliseconds
  const typewriter = document.getElementById("typewriter");

  function type() {
    // checks if we've typed out all the lines of introLines.
    // If so, the function returns and stops running
    if (lineIndex > lineLengths.length) {
      return;
    }
    // checks if we've typed out all the characters in the current line
    if (index > lineLengths[lineIndex]) {
      index = 0;
      lineIndex++;
      if (lineIndex < lineLengths.length) {
        typewriter.innerHTML += "<br>";
      }
    }
    if (
      text.charAt(index) === " " &&
      typewriter.clientWidth < typewriter.scrollWidth
    ) {
      typewriter.innerHTML += "<br>";
    }
    typewriter.innerHTML += text.charAt(
      index + lineLengths.slice(0, lineIndex).reduce((a, b) => a + b, 0)
    );
    index++;
    setTimeout(type, delay);
  }

  type();
};
