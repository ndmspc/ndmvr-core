export const fetchTFile = async (url) => {

  let myurl;
  if (url.startsWith("root://")) {
    myurl = url
      .replace(/^root:\/\//, "https://") // Replace protocol
      .replace(/\/\//g, "/"); // Replace double slashes globally
  } else {
    myurl = url; // Or handle the case where it doesn't start with root://
  }

  console.log(`Fetching from URL: ${myurl}`);

  const response = await fetch(myurl);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return response.json();
};

