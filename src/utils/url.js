const trimTrailingSlashes = (value) => {
  let out = String(value || "");
  while (out.endsWith("/")) out = out.slice(0, -1);
  return out;
};

const trimLeadingSlashes = (value) => {
  let out = String(value || "");
  while (out.startsWith("/")) out = out.slice(1);
  return out;
};

const joinPath = (baseUrl, path) =>
  `${trimTrailingSlashes(baseUrl)}/${trimLeadingSlashes(path)}`;

module.exports = {
  trimTrailingSlashes,
  trimLeadingSlashes,
  joinPath,
};
