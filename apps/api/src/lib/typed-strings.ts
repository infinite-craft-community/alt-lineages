export type UriDecodedString = string & { __brand: "UriDecodedString" };
export type UriEncodedString = string & { __brand: "UriEncodedString" };

export function UriDecodeString(
  string: UriEncodedString | Exclude<string, UriDecodedString>,
): UriDecodedString {
  return decodeURIComponent(string) as UriDecodedString;
}

export function UriEncodeString(
  string: UriDecodedString | Exclude<string, UriEncodedString>,
): UriEncodedString {
  return encodeURIComponent(string) as UriEncodedString;
}
