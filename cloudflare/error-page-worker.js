/**
 * Ankerd Con — branded Cloudflare error page.
 *
 * Runs on Cloudflare's edge, in front of the app's own container. On a normal
 * request it does nothing but add a small amount of latency: it fetches the
 * origin and hands the response straight back. When the origin answers with a
 * 5xx, or can't be reached at all (the home server is off, the container is
 * mid-redeploy, the router's port forward broke…), it replaces Cloudflare's
 * own default error page with one styled like the app's own error screens
 * (see frontend/src/components/common/ErrorBoundary.tsx and
 * ServerUnreachable.tsx) — same logo, same ink-outline look, same "Bekijk de
 * serverstatus" link — while still showing the real error code, because
 * that's what tells you (and anyone reporting it) what actually broke.
 *
 * Deployment and the two things this can't guarantee: docs/cloudflare-error-page.md.
 *
 * Only substitutes the page for a real browser navigation (the request's
 * `Accept` header asks for HTML). An API call or asset request gets the
 * original status back with a minimal body instead, so the app's own
 * axios error handling and ServerUnreachable screen — which already cover
 * "the app loaded, but the API is down" — keep working exactly as designed.
 * This page is only for "the site itself did not load".
 */

// One entry per hostname this worker is routed for. `appName` is the title on
// the page; add a line here (and a Worker Route for the new host) to reuse
// this for another subdomain — cdn.ankerd.org (MinIO), for instance.
const SITES = {
  "con.ankerd.org": { appName: "Ankerd Con" },
  "dev.ankerd.org": { appName: "Ankerd Con (Dev)" },
};

// Cloudflare's own vocabulary for the codes a home-hosted origin can produce,
// in Dutch, so the page reads the same whichever one shows up. Codes outside
// this table (an origin 500 from the app itself, say) fall back to a generic
// line that still shows the real number.
const KNOWN = {
  500: ["Interne serverfout", "De app zelf liep vast. Meestal is een herlaad genoeg; anders is dit een bug."],
  502: ["Bad Gateway", "De voorkant (nginx) draait, maar krijgt geen antwoord van de app erachter — vaak omdat die net herstart of aan het bijwerken is."],
  503: ["Service tijdelijk niet beschikbaar", "De server is overbelast of bewust even uit voor onderhoud."],
  504: ["Gateway Timeout", "De voorkant kreeg wel contact met de app, maar die antwoordde niet op tijd."],
  520: ["Onbekende fout", "De server gaf een antwoord dat Cloudflare niet kon verwerken."],
  521: ["Server is uit", "De thuisserver neemt geen verbindingen aan — waarschijnlijk staat hij uit, of de poort staat niet meer open."],
  522: ["Verbinding verlopen", "Cloudflare kreeg geen reactie van de server binnen de tijd — het netwerk thuis of de router lijkt het probleem."],
  523: ["Server onbereikbaar", "Cloudflare kon de server helemaal niet vinden — DNS of de poort-forwarding klopt vermoedelijk niet (meer)."],
  525: ["SSL-handshake mislukt", "Cloudflare en de server konden geen beveiligde verbinding opzetten."],
  526: ["Ongeldig SSL-certificaat", "Het certificaat van de server (SWAG) is verlopen of ongeldig."],
};

const FALLBACK = ["Serverfout", "Er ging iets mis tussen Cloudflare en de server."];

// Logo as a data URI, not a fetch to the (possibly down) origin: this page has
// to render with nothing else reachable. Regenerate with
// `python -c "import base64;print(base64.b64encode(open('frontend/public/assets/images/ankerd-logo.webp','rb').read()).decode())"`
// if the logo file ever changes.
const LOGO_DATA_URI = "data:image/webp;base64,UklGRjRMAABXRUJQVlA4WAoAAAAQAAAAfwEAfwEAQUxQSPAvAAABHANp22T+bZffQkRMAOzLwUHWNju6rV30DesSLTeSbddWCIgg8ClsUiACrbHIR/oyAhLQWFqrt1bV/eefs/be5+x9LSoiHEiS1DbDnS8hjIScwwO8Ydu2SGq2bV1V7TLdPS497j6MM8O44xqcwT0Ej4cQgocQgiRYglwRIIqTYCGQ4CS4QyAEl8GHqTqPZemurj5LqJ5f1xIRDiVbqZuLFEQ0pqZpfMQPOPFfv0YQBElRFGk/QKO7vUmV1mDx9gsMCQ0LCwsOCvCxmnRqZSO5OILUeHgHRaXklrbs2KPvoKFDBw+o7dy2oll6fKifRdf4TaI0VltcTk3t+FkrN+45ev7qjdu3b/x36cSBras/e39w+8KUcB+DshGrECpTUFJRl7eW7Tp7jwbX9PjK4Z9nDG6eGemlJRupfzYaz4jcV95Zc6qOAQDEOAixiGGRI+n59V2fDqpMDjRSRCPUwxpT2O/zw08AgJUX4wMxNOuC+HfDhLbpwQaqkalRpoiCASsu0ADcvjhJrFrV7ZnSromfhmxEgtT4Z3T7/BICZLfwJ8cd8MmutypjLUqi0ciGqIp3DyJHiwpDrKuj7ru+2f6aRmJQWlM6r3wACIFwxKrjiQ8qI/WNQi+VT86Q3xlgeQiq0FC3vEOCqRESCEqtN+rVlIC6f8HrZx25hCd7pk09UzzIxkaa0ScsoUlWk9ggk1Io3a/g/X8dbSgGIQZ29031oBoNaaRK7xkUl9uy38Qvv1s+8ZX0AA0hiO6T/951oPH+WlwSphH+7J1sJBoJ40Ue/pFNSru/tXTnlQYAoE9MKQ1WEwIcyJw17io04FgwCU/d1SNO7/aDvVxrSGJ+22GzN5x84PxcCo8XFvtRAhw1aeAJnPIRH8IpfmPbcLV7t6hNvhHpFT3fWbH/Zj17zALAIeDRxBQDwRfqiA7bXDPiT64HQxaX+rlvH0ptDozNbjn04w2nn4KTxZka4FArP5JvtX2LltCMa03owMDdN9NNbtlEUBqzLTG/w9jFu6++AMAYskBQNy5CxbPm+uSxN1xJJBS5Coe7RKjdsEVrtdmnCN5eeeQezSoXYXWNP0nQ8JRBbbYD7UoTJzBfNPMi3e0fvdmWUNBtwuqjT9hjodgPpQsStfyuHUP6h8+QK10chYFLg6LdqSCUBv+4/E7vrDn+iH23Q/hDQ/TUWDU/aWu7FxgezPtZGLjDiiKr20ymtF7hWW3Grjhax7I4peHKawOClbygS37/ESBezYrRzDzExb4RSjf5b2MITCwZMHf3PeCcn8GWDfBzoSfB6yS8K36xp2PCuRou6sQnIJibZSTc4qx8SGabN3+6RPPOz/4vgpN9ovh5KsMHXeGOu/DHiuIYOMUfLf1I9/d3Yw7L7TJtdx3ib0EMba8bHH21iQfBC/omn7j4ZXUBTB83SCC4/Wqkyt2VYwzN6f7pkXp+9zuunh/94OTSbqlWnt1ha9lGu8RB65lEAjXMa2Jwbw+6uoCMjp/83cDXH7F73U8v7Fz8eqfsMCNPJgK7nuLCwCf9hYbNxVa3dhDPhOYT9j0DxPBqD/ailDsHvv2wf012bJCHiu8fsTJy5AOuJh6qzdGEgaMd3FgCqQ9pNnTtI14eTlV6fHHLnBEdi5LDfEwaAdZlaRKncOYZqF00/ukfTLova3LbORcAGMTvboduHfp2Ym1FZrS/WUsJszZXn7GIs40HnTxNbyr3xuH0PByLtw06FSnzVq0tf9i2F/gaYmjHbf/qzoVjOhYkhnjpBVwKZGq6GsvzuLX3EXg2KU7tei2Td3hSVnZKhI9OzhXKFNdi5mX7Qfjc7p5e3DhzUMvsmACncgWDuZA7Zz8OMQjRMxM1rtgYUTh07prvPh9ZmeCtJuQaKu/0Xj88xp4WZsBuObNuap/K9Agfo1rwi9ta8gsONg2DmZXsAoQxofOqG4563d3yWnGUh1Key9DYCsccAoSw8zdcWDu1T1lqmLdelAWIFqmB/iiJG4QmutseAPb64etf9MgM0pGEHK9GrPnoP6Bx2oJh7JYbv8zoV5EW6uVkIQiKUiqVlHBeliJpReDF1ARuM+lbvg5ohn2JAvrrw5aJniq5DZQ5sePKR4BTpuNSrju4eFjz9Agvnd1CUCqdydMvKDQyKioqIiTI12LQCPBDJDzyvsN1idrs8Xsx3AMf6ug36gBxfVEPNwwrjJDXlxUIpVdGny0MYvC06+smdM6L8bXnJwil3hoYnZpf3aHXoBFjxo4a3r97m7KchFBfE+8/In3mEkBYQAwM3BwRpuSEMXsV0C6+rH8+65zuryFltHy/piMO4zztIgboS/8bUZ1iM6tJu0XnHZ5a0mXMrG+2Hblw/e7DRw/u/Htm34alHwxskRPjb+CXXZs8A2H2+3xU4UzPIIr7rlr2OzCuvi/mz7crY81KQiZ1dVDRO+fsjKHBPysHlsT76Ci7v8pkS63oO2PdsVuuF249ubR7ychWWWFmPg+cyqgxD8UZ90Df9thT4819itaqfcC4ru+9b/vkBmpl0UhqQyqm3wAaJ1fdD6+WxHo5bmmk2hqR2/n9dZefOfreXO+IIcZp6PX27lm9mkVZVdgKaet+Dnvcz8GX+DrXw1WvZgswGF8bOjG5ZbxVBo2ENqL5/Ac43xs0HHi3eaK3xq4RSktUsz7zDz931IdBOLdHBtkNpxb3yw83Ubgn51npKAozwOj3tNvzA1dLPPSpCzAADAOP1w7OC9bJnZHUR7deXg8Mxjd++8tumf6sL40yhObVLj5NO81C8OiUM2cWdMnw05KkUq33sFitFpNeoyTZPQB9+nxAgBNocNF4or3QI9jF5aUKrT0HDXiPjOdmtU6SuUdgQh/Tfk0DIIxv7OCb5VGsHxGh8WvSafZJvFkIjMrWH3inKt7fLyQ+o1lZVVVZs8ykSJuv1ahVUZrIYf9iCtminZ3K90WuprgJS+b0p1hdJsTA802D822yZlSHtv0ZGMa125PVvbL8NSyrMar8zd1sjT/RDDz4ql+bdkOmfLl22++7fv1x8ZTRvduUZidFBQfEddzBPe9vx6IInryVqHH5WBFQMvuOvZnxrsXzH7VKMCvlS3oVLEcuGTFw5aMWcR6OfhOh8k7vtuI2xlfKoxiAPcv2XXsBTvT81rkDG5dNH9u7beu+M+uAs427HCV8v3f0e2t/EuPJsWDsrheA8IxP1g/IDdCSciUjXr0BGHx4TFGwlmA9EwQXjdmLANsDr7nYY+OME7Hr8uzelUObv5p6nBuWQcTv3fXth2kGAmfMMqXD7LN416e90qcnVUV7yFQ33JCxDGiXbszmPlnerP9KUh/V/KN/OW6Lghm5nw4Qw9DO1W54AbiSEgZLw47WgVgPd5QhtFn/NXfxjDQ8/Lprmpc8HcxcvN2VRPB4RcdEM6VwsCmx41dPgaUJq+Ddw9hPbMJImr93fWd8Ku6iC5U1rurtP+uBQVhF7hvZzKaRo2Ct/NMFaLgzp3kU+/1eypLWaxNjL1MqxIfNcMTyUl+Kx/v86Z0XXAGMr8pRk6sza6IMpAx9FG3lhr38iWUhWidOH/C7w03qgBkOGg27u0SqCT77WYQVDtv4xG7ECU+/6ZxsoWQH+rTFnGDg9LgCfzXB5oxBB+xHkyp3oQlyrBeHp/Jbc0qoPZNaTT0BwGB4AbNzYLa37BShCh901dkR0XB4eK6Pkn0P8Wgy6KDj25O+zTYrRe+8l+tJ8V60Zsvtu7oO54ZhP4/j45r5q2UmENamnzWweqyIQbC7f6YnmwljSp+9dn4pAep64PuphX5K/l+l0hJXPeEwDQxWEROLg9RyI2zVKx47TSZu6pnmdGMmdHHdd0iY2bcWJP9OcaBKkItZ65/V43/3gUE4NZ9RGiQzKqEJK5+07wGDHh37tHW8iXSqTES7nyTAjvbjn0dFFPDF7VOBasEW8MRUvnMI5wGMgfuzyuQnBKS2GP7BpJHtMmzO+8ooAyuXMAhJ5/fFL48nf57dPHvSxyDUfqSkJiCr51d2I4ZaN63YXykziZTBNzQ6Otzf5PxMQnnlf1gHSFqPV5CgvGsiwJPrV86dKcxIjAz2tRi0asf+vDyL9IipmnjcXl/X4fbEfG/ZOSihVKm5VrAQhpTh5x0PY9IK3fu6Pp4X+Pj+zfNHaxZMfK1Xm7Lc1NjQAC+zXk3xvKHk9F/7zLXRXtjYTLO8zQWpw1lD1JJFX70YDn33/L6NK2a9NbhzdX5adJBFQ/IIlCWxzSf/uT4YDScGytvuLZRPyUIJdfesUIUiAHp/tNBw/5/ju76fP75LYWKAgYc7qQstHnsIkOvwW+cojXwFwpA62jEU/hKETWWGRhsOsbPWnfn+rTZpQXqSwO+G+2T1XvvC1V0EMfB1VZBStqAKab8TGHgJQBdsu8MwNCvrkz8mt0zkM6ZNmRPbL64DxtWZPZ2W50nJFEhL09kvEJIQApQcY9wU2ZUdr+XbNAQPr4iq6bdcqQxcHp5sIOXJpo7uc0qCHW5RDUBEn6XDcG12TZSBInGLIdRBJe9dcfVd0rCzQ5hKnqRX8XInllySYn3wcqD+21eyw4P8/bwtRp2SxAj+BW+5CggxC4u9ZcmkiRt6RWoQlrBhUxN0BoABtHZo7y6d2lQX56REBVn1KsJFUPkVTrjhKsCN0alyZCK8SlZJW/am4YPnsAi9OHvm7Kkju9d9OX1Ut4r0SF9Xq5CV/qXTHwFycan8JksmdczQyy/BcGu7th74duWqF3PvxMZPh7XICLeoSU41uHqxq9VtqH5eM09SdqS1aAUHSzyryxniXmLYxKob/e/OWb0KYjy5BlgJTUT7dcC4EJeGJujkBsqIPufEhSR7KxFnAGK5Pj+7bFBJNNc6cEKf2OcvF8ejYW3zAEpmpDH7EwaBTMDDEcDwz4p+eaEcW7WT5uw3b3Ff1AgevpchM+NPZGDbfcDII4TqjjCn57RL9lI598D9yhYyyIVp/ysyk0UT//p9kMcPwZ6GETzb9mqBTetkVEe+8psLgern5lkJWfEuXP2yyfDhhVkHfmVmi2gDO5CGtDHXgOEWZ/pFq2UElK3bCfnAaHklT8Au+aOvOiV5sAPlW7KUdrmFY7GXjAht4oSHgORH78xjrMJlQr/0SjOzgzqi6wFXWf4bFisfgjAXfOscly/XFuGNf/Rvwg6EKfM9+6XNLVbnWwjZQEDHQ3bIEg26iRP29U9lJ1IBzX92lXyhk3zs4KWKGXnPHndHhBpgb+9kI6t5tQnDL3MGBPeG2ZRyAX3GHHBbRMO2zjFagjWuX2TPwokHo0LkAoS1dC0r7p5UBKtahqhYWaJ6HQeGC7f6BckFyICOx+xwWwGezSn2oVg7wDT9qIFD0HCg2lsuXKjwoTfdToqLHsZ/49JNjhZWhrTfDQ3Ov0dmeqpBLqBNmPTYDnfms697lJo1AJs86hrQDLJbGNjUIlA2PA2ZSxgWu7HEZWW+DhPlmf3WefYVTm/sHK0j5OMNNPYTuTsz3Rqbome/opzR56szd+/f+HN682j5mHsmvFvsYcGtmba3sSnZe8pH5rYfPKJPVWqgjOxIQfp3Pu6O4Hq1XRZ7nodUm/1swUHejhWr8gFb34sOFJfa38m5k0eQlNLx4oKMQBk+4obbA0D9tEwjIVvLfaNel/CoE5CIaW8jZQtxEx5Ju9uBJMoPJ6bo5QrqhMnPHd2+8spbqnzkSmgSp9VLN3L8Y4MUuDo8Si1XSJr+QrLofmicgSzMNcnWx8sCLM+etv6ETJkTp9ZLF5kIgnsjY1Ry5fLhM3cIAFiQZZCrgt6tc4tgYHu1jzxFlVFj77hJXK4NoeQJoUP/lfK4RyIgqHsnXiNLIINqz0p63CmRNGKWZBplCYRf+yNygdlfpTCwqdRKyBI8K7cD/TIAZoD5OdLej5QleOR9C8zLIdfnUn+ZctSlzq4HtADLW0Bwd1y0PPX8VDHj7gNaPsYKoOdTEtWyBMrW8+JLASYAzEvXyVNGn6odwKwOhsxaWNnUIE8w5iyR7geS4fsCk0yNPMW//lg24rO/87GxzCJTOz7Zuh6DQ4lsrfJUyBNZitfAYXLNgu01cgVt0vuPiNnx0tn5rbmXTIGydfmbh8l77xwIc/5yTA3TYJtsRRTqmOHviMljHzg9v1Za5QqkT+XdKUPHeBnWlZoVchXVJp3/RMwMk2BNM5NCtoTf6Yc8zBtnAYLlOQaFbJEu+Y07wLyskqsoQnOb6GRsz3W/yh8kByQ3cQTPJiWo5QuENn7IZWDcWpyB22OilAr5ItJaMJdG4rc0rpQNXOgbTMoYFKrQjjtEn/9HmFJGcKS9n6yBMKS8elnkwMAjBjcuF9hUZlXIGpFezWY8ASQiaDhwAhAOkFwAMUuyjHbImslWsxKJGBg4PPM+JkAegODRhHiNzIHQRHfcBIx4+vExa4HGicsIrvYLo2QOClKf0HM3NCBxbipw8O23zgIjiuQylT9b+hIK2QseqX33ghi7sDAIbRs6YG49QpidPtkY9cizjzrJXzCn9f9DhEDDkzXdyl7ZjCflA/D07US1Qh5D7S8I0cJaGbj+Scuk1CFXAU/KBRg43SOYlEMoKI+kzt88EbR4Bph9Y4tDvbNnI8CTSDZSfiyzEgp5DIaYFh//C8iuCLXJ/M0V3TJ8NP7Nd2LH5QEInk1J1SpkkkhtcOGoXTQwjDDa812vl0cZKXX0sBuAMGBn2Yif6hWilEsoCJV3Wqd5lxAgxF+rPzqjQ5qvhiRMWZ/TnCxHWFPkFJdLr7CCQauusdoW8bBA/d/zuueGGCjH5l2t/8DtdMgEENx/M4EVl1GjNa58xLd2B0AMg1w2FEM7mvjB7x91zw03KQnWwo3RN7mAhMUq9o+2gaRCXgOh8Ykr6T/vz9sN4EjiJOSoSN2xr8a1zQw1q9g3E1PeUvG8BVCDFD+YmVkGrrhsHlPjGZXTZuTn28/dY1xcxPcv7F721isFCQEGJcGxdfJ+CeHFIUaC8ngP5zEnmXVXGgNisqprX5/z9eY9f508c/bE33s2fz3nrb4tcuNtZg3FcSWr48c/BITF4uD5F5Lbh81+Up/nm+1SlhVSbfSyxTTJK2/ZoXO3bl06tCzPT4sN8TZpSO7v0dxsJSBMKQIQ1E04DozU5Jk+kSqFfBNBqbQmq7dfQGBggJ+31ahVUwTh8sWFzscxc4uEf0atkxoQvSifo2Q5L45FuOvmEx1bt2ABxAADB0fPfghIWvJEz0i1wp0R4Vn8PfeMj+jY0n/oCYmJhll5ZsKtgQrpeRIzDiLh65qaZYAkJX/vGKJUuDXoUiZz7tyFxEF31szsrLThNwBJiO+8lWYk3Fy8fC2eFCmO4MFbcYGVPwMtHaCvKvwp9yaV4X0uSggM/DMw1Jg0/hYwkpF/9YrRuDmpS59BAx6LhaOd/FV+VeulIhDcfSfLg1C4N/hU/YotRQEN2yu9CH3SyBvSEIhBX5T7uTmbQhU56BogDGzqCnsX3+R5EJRP2VeApAAatnaydzncHIyZ814gEXMLW9bPSdUpFJqYPieBkQKfGJhsINwcSL9Wu4CWThxB3VtxavvZWHKnPRFfRXDt9RwL6e6kOnrkf8DgxaO4PpA1Qq2ytfxZdMHA/WmFPkqF24vnLsLzDqwc7xhAsp7m4vseA1pkfja3Ikjl9pgIaPenqLkFWDnZC9Cy37wpqgmh54tqQtSE24MqfgznC8uIB8FXzqtDlb4lc8T0YeDpkhbhGvfHhDl/GSBMGQSgWRzLs1TBzZc3ABKNn3zeIlzr/lhBBnX6G9M7rueT12NVHK+CRrVbgxASie99UhOuJRXuD9rEd7BnfMK42j+U5HoNIqbjj7QYATHwzwdlwRp3yIS1cDW3jIeBwx39CAVXiO24ukH44zAIDo5uFmAvzQ1CGdwdc8Ynki0Vjq2BONW2Xz4GRmi35z/VZnir7OwO4ymTngLC4zhWNjUquIMuovqj64CEU5Ddeml263gPrrE+dzfj87O4kkKl4SOXq9MJja1w7D4ABgmW6+mW4QUhOlLhHkGF9bmAh8ied8e73pqbUPlk9Fh5x7HQWBCt4fi0Nkledjc3CV36tAYAacUv9A2mFC4DZYouf/P3p3wdWNcFc35Jz1yb3u7mJkH6VG0BRmI41A7r3VRC45fWfsbBBnvFMN9FcaoPc/bLAQWRHkpC4Tahihz4Lx7gDntsLrHi/b9RxpDsztP23MdZhu9cEfRg35zehdGearvmPmHM+LQeEAY8rQD6En9rCKUpJLPNG6tPPGS3tYtF+IDu/f3tG+1yIizuVVOQvi0xZ3wCQfB0aqKWz7tAgQmF3d5d8fvFx9wnRt879eviNzoXJgSaVKTCvZI6esQ1zDgDuTeS1/pogtRabfF5LXu/PnPZT1v/2Ld/767NqxdOHtmtOjs2yKIl2R5uNZ67EBCOjOVijyCKZ0eHUpt8QmPScgoralq0bFFdmp+VHB3kZVBTCjdMpH/bPRLJ7f/XHJRKazRbvX18fLysHgaNkmsxuLuNx42+j7nRQSg/Fgq5MS6ruXn5usMZny8lE++1BRl6RaOJyKCOf2F2OkIr9e8lqBtP0Ca89QCQ1HBjSLiy8QRL4Sps7zgYONY5kGw0gQrufgy30xHK1mqvRlQ8+YPHXI2MpIKv842NJhDWsh9Fj3NcQfTHadrGUzys9hwXkDRSENx7I0bVaIKuyRTcGR+Exhf6BVONprh3xSbseCiH2voSjSUow/tfxQMiAC5sKLE0muKG9NnPAWEgxnLvy51pcFM3KYIgpDfj03yH9OIIHk9KcEM5KZXeZLZaLFIbH1ZFDseNM5bbwyKU7sai87TFpOQWlZWX5DWJD/MxKiWjGHMWcDMnYiunOweRbuVup/IITint/ua8VZt3/rb1p6WTBtZkhntqSInM+LTZLYE4DnZWe7uVJyNTSE6XD9eff9Dg9LU+uf7HZwOLY6SxMEQVO/IeICyOBcHXeSb3AVLjn95l7l/PHd8nQ9uJvT7k2nfDm4UbKPHhkbcEEB8Z+IubNK37YFN05QdHXnCvkXKqw7Vlr6R4iX4MMqj9Ybx4eM+H42LdhSehtKZ1W/0Qa6UswwBz4LUcP7G9NPGv38f62DQUBi72DiHcxdF8c4fudXyTWEQzcG1SQYC4C5MJS7NvuHNLB3vb+LoHEBpb0Zun+KxRpuH+jAJ/pbjxLkdxOx3R/Fxsdg9l6MKrpl0Dmk8rMPBgUo6nmMfVJk3g3uNVbAAXFmbq3QEoQ2zrRXVObjzU66OSDISIMz7Fa7C9g3s+mRivdgdsTumy5oWD+YZDr4Sqxdxk8bQUwcC/Q8OVbuCQXpn9tnPdTXglLm8mnkmXNukFICwO52inAFL2ofLPG3kIp3yEcSUguDUsWixBeJWvw5ax0LC1wpOQ/0OWvHeBgzHmhF2Jnwq8CLFmfPpeBoQB4SWO58oco+wfMqL6I4zdIhE3cePGwHCR5tgNabOw93iN7vl0epJW5tkY13bpExzGD2hJE6NYmyxuxXvXRgK4OzJSJetQmlO6/ljvkhHiARr2N/cWJaqKHPIPVoqdYwAunO9uk3VP50PiM9Z9/vqQEKUo8ax5CCHpSO69uWt85Lx8tV/eyL+A4c8uWqxhSpxGlE0WWzomnCWJVfkecs624ncvYJXBVyzPMIgRj3n1FnBJCQHQ7CZaWR9pmnGDXxncTcSFdc1MIlxhxtzPAWFKkYHg0fhYpWyzIab1wjqgeTIADnaUmUU4x4C2+zG9RQcDl/qEkHLNHomdVjnefucBVi2wsKfKKsKrfrFj7gLCAoiPvW18ZHuKrUntFgYxPDXAxG4RQJjzVnBLSeEnuZ50UPnkDNkHNOLLgAAL20WIUIEdD+PFxQNXPeCzTL08HzKg2bjjwAjDWPNc+cK7aBPfxn3VD8T3fPhevEqWF7eElL3/j13nqw0ALixN1wsfL/pGIhLnGrwyKJSSYV0bUT2LNdDHC5RB8HxSrFrw6yy423HJ4kgHf1KWn3eXPHbNY79Fs1cGCD/uoU2Z8AzwWDSAM2jYXGol5BaUif28y9eqW6Dh92phx/0ISmUIa/UDIElKYNDSLKP8TjCn9twEfJ93e0AANSzKs5AC5SUotc7DJzgmo82IM1hxZxn9i4NEjfxOMA/4HRDiy8eRznQ4NapdXKCXh06tUpKk6zdDCHtrk6RSpdYZzN6B4fHpBS16jp+79q96ACyABHBLbuf8CZVv09eOCFC+CQQXVs4a0bWmICMxKjTQz9vT4uFhMhoNdjKaTB5mq5ePf1BoVEJabknLroPf/mT1nosPXuA2nvDAuwhPyu1+B6qAgjfO8u5uqHBTw+3j21Yt+HD84J4dW1aVFObnZmdl2ik7J6+gqLym9Su1Q8d9MGfF2l0nbjxjV5+hcaUU8Ku8zvkTGlvpB9eA5nPIRs04VQI9u3vlzN/7dmz++btvVnzxxRdLly7/36rv12/dc/DYuX/vPmacm4bBvspAEkCwPNcoq7290KqPbgP/8q1wbR6JUXvXVePwlTCAnpKskVFdF9FiwWPebDnUWDVi7ETTDAdx1cNeU/y2kxQQ3B0RqZRPXR/TZvkT/mxAOsTN4oHTs6t8elLG+E6rXiDevBRIGthe4ymb7JHUdR3DVzfeTckV/pdvlMtUc2qvrYhBfHkJQVwA8cBVjYaZKSJ7kkq1VqfX69RKkpC4bknvuwsYxEsDLQieJNQZSEPeGh2lEvExiNJZfENikptkZKTGRwRaDUpCwmzNGrRfgFkGHxHfwi0lgTM9gigR320Pii/oNGLy/OX/W/H59LE9ytPCPDVSfYZQemYN+9tlGSAYQ1gy8XxdSVEBnBPgNd6EWJo5PLfrtE2n7jQ47cB+fsfc/iXx3hpCmpw94pgA5VsE2CRca/OCBJbc5XmI9Qwa0rTv8gv1rMo7d2FfXPthZEm0WYLFUN45I8/aU3mzzQhB/JsaJy4FIKj/OFUn0g8hucOiqwCOfqvzN8aqwe1VfbL81VILSu+mo8/yTzULIKkR62wkgftjo1WiuPnnjNzHgMunUFY90KmJpaFaUmo85hwwwpc/mqfUAutcJOJ5sWcwKcaKk8Ciyf8Bw+CdGQN1C1tG6aUUKK/c0eeggW+OtcT5xEEaKX+28RMBysCSTx7zeLmagRfftI/RSSdR6ZUzynUqju7lgOiuzqftShN7u5tOoUrhfwi+BbMeAcPn7ID+rl2UViqBsmaPdMniPfw4/WTEtnD4SgYHxhYLvhEJYc585y4wPE+P+apVmESOS1kyhp2CBr660Io4SeDCIglw9vveLQ/XU8IuuIrpdwZo3s85LxZVBKmksa66yaCjQIvMwqRd1JVfW7uqnpNFagAEN+d3SPMW0kgFVK13MO9QN63AWymF1ymT++wTKDVmU1FaSooABp5vea08zkdHCWXQp77/CLAuStfh6pgMD9FNhC6u204+3T1HJaTQBggJUyspw/H4enXl8MrkIIE2hiQDWu/G/iUAN9FwsGes2AUQmsh2PwMjBIvsyjsqTUbIZXWAubL2nfY5kV46SojV3+88c/nV4Yfvm9tU4rIquOZLGhCvVFkknzViXdt1+z7tX54cZOY7cEp4lWzglnwuVQRPZuRbSVFL9y2a9QR46e4EwOpDo8s/vtc5Py7AxGtfNmVwras9f/kEBi4OSdKJaCLN2W9cB4YnlyKAWO5Hlo9qnRPtZ1SR2PGED58C4gUXYXObEPFMpC6x/1FgeKQm7Q0PnpIAYG7/sWB465yYALMW70HMlP21K8lLQejZx808RZtUUoW23cRPZ9I+OULsjm7+tnB0h2aJIV4GjGKtFb8BzRPIhWloolgm0rtwfj0gXlyCgGLC0WI3D3w9oWdFVqzN06CmuFxJ3/ZHgcFpChd14A7rWwUpxSlRnzL6GjC8U4soGjZ/eP6X+WO7VeYkhPpZDFolKysZ0OMcDlxeBNxn+WxKrpkUx9ZhFzA89Spc/RA6TWQ+OLlp0XsD25VkJkYG+3uZjabIQZfxgBBuYOB4bYxGlN0l8z911d0eaoVir53TjOajS4c2LJ48srZdZWFOVvMx57Fg/0T4pq/KfCnhoY0dcBEYvnr6RccSw963/+6lI9t/XLbg05l4EafmwN3ibVyqQfAspE/Jar5cgKs4/JK47kHoBQ2AAWAD7zRo2NEuRCW4jB/5Hy7ao1aCoyT4V5XjFQhMsM8GCwjqZzQ1E0IfouIHoHH5yKtCgt5p5AWHH15g4GRttEbYoI4dfhMQvl6HqI6IYAeEF9DKEh9S2J39C1baGQutVueIB37i2qhEnaDjraE9uCf6XadW5EibigFegYYNLQMoAaFPnf4UEC4KFSQWEB4QPHov3UAIubX2ZsB9uCsHNqtjKQkJRx15mv7oEKoScGf/3ucw461XVcL101fsXwS/gODZxzkWwYQm4QN7HNtWVcLhE3ABAJzAHn6KEEyYmq7klO6Qyc4aCbH4jMdYBF7griUsLrQSQqXU/AYMT1nkNQn8AoSLM+CsPPcM0MBYtUAI7MZZKidv1OhIAdy/Fu4FxmXepDCe4cPvAMICC2xcTSUCCyL+G5GgFcSkin23HsA1HLLKJoIBHBBC0PBTpTATEJrkGYAFRSt8GiAcuwZnAE5xa3yyTpBed5MFgNw8AFy1Gc8nMTZjBIQXNrbwp4RA5lJcFNy4242/JogJQd0bqToBkg1Zy/BReQInK0dFMOuLLba2CCBFRN2NT7/PSRNUvJuqFyCSsRgXu6AJOCiI7AFzCrpVAP9kXdpcAJGxF84QXPFeqoH/pGfSVNQYBGAKBra15p+sjHn9KSAc7C/BFY/f4V8IGTr4emMRPfEdhAjodBxv3G8nguD+m8m8hbXiFxwg7sfylmo/iieM2V8AgkahgBjeGpeg5Zsx7t1HgDDExl4031d480ymbD3PANMoFIRY/m9YnJqno2fpJqC50OgsBMHKIk+ezvqUGc8AYYmdCAMX+kSqeEbDai/ao43WQhBqWJDjQfCMFn/PjUZoIYc7B/MsWJP4+iOsKLAXDTybksZzApT0b/ObXTQOs6jmlxa+PAs2ZEyzO2OasA/Nnddi1TydgzsdwBXEXhy4mYWnsylz5lNuIUywnRTdva9cuPca7B7K01kZ0mEfdysifJ+YZWyvpeJBuHeEmsp3ApowZkx8gh1oWDb7n1dqE2V954AE0PBrlQ/BMzmw5RbuZBgv3iR/YNzfqWrDK0P59r0JfdKoay6ySG0vlaB1RvOyjAqewqd4GYNA8kG9NddodrbyJfhOP0R2PwQ0RlhjuGoSkAyCm8OiVAqeJlPW2/fBhbpKqycBzQDMzTQo+Jr8K1cCg1xguQRQWbij2p6ZJ2miu+/HM+2wq4ECgqv97F0/3qb0cTeAESR4ro53ogxHLDyZnKgVYOPd4rkvgOtrn/HuyLE76jE0rMkXYDcidWibdUDj/zGu17UYGDjQxpcUYN/7hN5H2KbVux6bWeYIwsCVwWEC7EhKemSOueoU1tjU5Q6wDBA8nZQgxIaYlHf+lAeskEYpacHWGUd8kW0Q5DXkgJLZdS9bIM1OGeHGMoswm9DZSmfeAmbFg21M1MDBtr7C7EOhDix8+zQgmuHdRgyLaIa2E8NF3PVw/G+4aQOAhYu1NlKg4JPVd+1DQIxrhaOxBf1VIucrQGRFhoMCgnuvRgi1GZ3SHFs1Yfdje1XZTYbT1MyzR/du/nvpzImjh/fv2bF1y6b1a3/68ccff/rpp3Ubt2zbuXvf4aMnz/5z4+6j55zXjtMvUaQkp/rIOgCevx0r2Jb4hNY/tfWE9ZcbgJsaHt25curgzg3frVw4e/K7418b0r9n545tWjWvLC8tKSosLHBQYXFxaUVlTcu2nbrVDhwx7t0pc5asWr/j4NnrDxs4fog0g5CIBlkHmpoo4I7slCEgsazPh1/9dvLy9RtXzxzc9sOyOZPGD+vbtW1NaUFuZmpibFREqC3Q38/Hx8vTarGYPZzIbLFYPb28ff0DgoLDomIT07LyS2ra9Rg0dtLcb345dPHOY3a3XoB7J5+iZRzwaZpWyM1gKa01NCm3on2Pfv1qu7SuKMhpkhgTHhLg62UxGXRajUqlVJIkSThIQXAOqDiqYSeSpCilSq3R6Y0WL9+gsJjE9Lzytj1HTFr44x9nbr1w+gnybUV5LxoHCD7LcLyFL6hBY/LyDwq2Bdlb22zUqpUUaW9hUYggSJVGZ7T6BUckZBS26Dl6+oqtJ+4hIX6A+A5yjaWZeuEbzO5qJ5JwVEEKRFBKjd7sExSV0rS628gZq/Zee8Kwk3gUja/kzLIsg0IWyPEjNHoGRacVtB446X9/XH7uuAXyKha/mIT50gky4UootWa/sMS8VoOmrj5w1/H18DFgO+TLYrtZZsie5OEbllLUaeT87VefsQzYRWMr6XZpwoLsJKm05oCY7Jr+0zece8rLANjFJArAxylaZ8jPYQw+4Wnlfab8dI4Gx5CXGygGWGj4IFHtEvLyN6T3DE0t7zN189UGu7vASpIgeDw+WsmGfGXXWcPSqwbO33MHOfqEwhaTIzcGh1EK2SNK7xOV1WbcV6de2N1pJKRDYnC//BFEyh8UBKEy+ccX9Zy24w5jd5dtBcTCn619CDvk0EBqLGEZLcd8e471DyRoMdmxrtSskE0iKIN/fEn/efufORSBHHJxsIE77y+nRGq8InM7Tdx6FwFCsqtA6/lsimPaQV4VlSm4SYvxP15FgAQrpk1k4Gv2xmsRSteQw8cw/8Ty4SvPg12Rz+GQ1sPByW6BpPxCQZA6n5ji/gtPNQincHkH0BRo2FnpxZVTZv+ArFH5veYfq8d/DJaHXnorCQZW5pgUck2EyhLRtMecIw0ANJK1RQJtRlQEj9+Ps4/6ybhiDsvt+tGhp7gOBsGKBrK91NOx+ZCsKx6h2a/M2MdWhDF0prOwh4ATPxd7EgqZJ6XJoex97ihGhpaLiTvNHX/Tqdch9w4h2Z2n7Xc4ZOMAVmjY0SrAHncHiikku5NzMd6JbdPFMi7kg3dT9fa4W1AEKMa0DPM5fj9LpeGnKpZ0Fwq7mO/yMNP/xwIifhTMwMm+cTpn6T6KmfoHWxHBAEiMu6DLWiKeFgy+9Xa2mT3m4UYcjCGZHSbvfso9RS1Cy7CyCpxXkF19sPjBzCJfx5Cf21Fs6e0/2POIxwy1cA3ksjqcdUAuT0MIDZPvzy63ORZcuCHFEJTebtJvD10qgjaWwP/uIp0DYuDqlDKbmlC4J6IMQU3avv/rAx7FALw0e5bw0Ji9o5sFcrE7KiYwtdUb628DoJdYAXxiAG5+0SXNW+lgN6boA1KqR333D8OraABJ5+XhgeDx1jGlUUZK4e6I0vollA758hQNiGHg5TEA8Nee7ZnUKtnH7uYGidR6RxfUfrLvEatoPoaXxcL+F3y0Z3L7jCA9t9WtFUOoLeE5HSdsvs761nk/SIne3IJY4Oav77fLDDbyK7OkFyKp1SNXnGgA9pEEd5XMI7JjMKzh5Fejm6faDBRLc6cKpfeNLeg+ZetNxtldCllBUGIcDx4vrm2Z0rMwzk9Piq7J9RoBc2h6zYjlfz1kHemlmnFjP/TRV3fOHVjVJNSi4dTcr7tfTF7n974/84L9RufLYWFYloZLv84Z1jwjwkfnVLbbVki1OSiptHbqhotP2TcjKYPj0mq4d+z7yf2qMyN9jSqCpbl3xd4VsYalVfSesv7sE8fvQqpJyPl86s5s+3xcp6LUMC89lsV9H0nnFZZSVjtpzZE6cEqSmK/Ty3GPz25d+k5tVWZMkEVLOaU1GhSC0nuFJBe9MnbB9suPGHYSI4k/GafaM09uHV0/b3zPmpy4YC+jilQ0SoigtObA2Oyq2gnLd52tYwvWLlQizTFz7ZHx7PrxbSsmD+1QmmFPM6jt5TZmiFQZvUPic2t6v/XZ+sP/PXf+9dCsoyBB+iUM46ikc0XqLu1fv+TDV7tU5iSGB3jqVSRuWqPjDqgxeQfHZpZ1GDzh87X7L999QnPcxTgIcZCLynDsNPbgxtm965ZOG927bWlWkt3XpFWSisYUEZRab/EPT8gsbt1r5IcLv99+5Ny1+88F+Kh/dOvyyQPbflg8441BXVsUZyfHhPia9Rol5w5AjS1Xg8XXFpmQ3qyyXa9hb0z+dOmqdVv3HDh2+sKVa/9dv3Hr9u0b1/+9cuncicN7f/tl3bdL5kx9d1T/rq0rmmUkRYcF+VgMjryKRh4RBKnUGDw8/QJDoxNSs/KLK1u07dStZ59+AwcNHjps2OCB/fvU9ujcvlVNRXFeVlpibERwgK/Vw6BVUa7yNvqyOopTqXV6o9nq5esfYAsOCQ0Nc1BoaLAtyN/P29PqYTJo1SoVaW/vRi45bZRHUizi2E3v/1uRAlZQOCAeHAAAsIkAnQEqgAGAAT49Ho1EoiGhkon0hCADxLK3fi3MhBA38hGfJvcrbd8V+Vn5i9VPxd4A/KDq8jr+wHxd+5/uf48/DH1Tfov/de4J+o3+q/sH459ynzCf0z/B/r97zf+G/Yf3b/23/Gf4X3AP6H/besv/cX2FP5R/a/TO/c74XP23/az2kP+zrR/nv+tdpP9v/uH7R9gL5P9nP6dztIkHx37c/kP7D+6vtN4Q8AX8N/kX+K/qP7l/mZzHGzeYd3i/0P9l/cv/OfHvNl77f6T3AP1J/yPGp0AP5p/Uf9L/gPyR+MH/j/wP+a/bb3E/n/9//7H+V+BD+Xf2X/e/3X/Jf/L4sfZT+1///91j9a//kOBQtyEloW5CS0LchJaFuQktC3F9E/b5QcB/WZySFIRyxIQBxkN/73teyp3OUdLM2v9zTbfzlmckhSElkXX/YY6vf4t1+ndQRHEUCHk9N66M1CdXOzYbl9ZnJIUhJaBk5+4SlFUdJwumCIIyxEfqfIxJ2UOm3vN00gQDS7+TJO72JqNHDpyEloW3yg7kXStGavcQfGMoYJxeJbiT4s+LxnYrZeD7ABYAGh25ovv9F7FEw2uu20fIth8paMH0d6GSLQtrMExmjeH06ETrNOkdELscrFyOumvJDCd2sTeb+yVdNsWSVrpx7DHwJuEsTsUKdBld7sHKABJCmfi2RG8Am3F4U2udEzzy+KIei1kpmVfNwkaQQ/E1rf2t5NVEOS37vg+Q7ZfGlxHISWhXvJekqoJqKeW5vzzRRtb9EOpe405D9mQcZMprQQmnT/HV417Pml9th9LiwihbkJRfpa35FiZFaq+rXy6F3gjj5NawzpDD64eLSSouM3Phi2eeg6iKXdwpCS0LchGitZlLW3tXln2WEZi/I5ZgNaR/+Y80CIuED6++UvvQaQQ6xQtyElkhB4pb06IITCrXGO0A6CKVtDUhJaFuQktAj4xSPFEvoDskZdl+SFISWhbi9n9/5Ax96VC41uT1Sx78AJIUhJKJ3v63ly+Hw+GrQrkmy/ie0FHDx64zSpc8qW8AHBWE7FCNaSkhrhWn+/tf7UEXSD4kEO47NQT+wIT7rShGsuKgN4FVJBSEloWzjlAN/ORSC0bN0bYJ+7uQOp1vd0IJPr+egI5Edenzk/ukllihXOvLOtwUImv/kMP9JvxrX57HI2T2m8ff/coAzFtOVIglBIwIa8sxBhGUhbA4b9oIABnC3lyb41hElx5FA+IDmpetaXbygyqWvQZ5Qw/0iAGG/xWww7hAXeBCTVX+heDRuv+brFhbvN7WBl5DD0G4R/d0+kQw5m0OoI/091lvj5L5W5CS0LnMY8G6B+H4kw+WvRGhq5ZHEAc7DmZGg0eUpJh1ihbkJkhE4ymt2zY6Am7XnR/evQjIf8n8Dw4FoSKHt/MenMB3yOBqd6ISWhbkJLQt8ucq6RMvoZQxYh8BSlySFISWhbkJLQtyElkAAP7/scwAAE7Vo0aF1ldwPCaytlzss8TFM6NTbw1Lawjt3xzz6llJh2OUfD7s/cByXuh4jYQYDrbHCRQujX9/z8yON7VOySfnriJ8Iu36cGXlEGhVDggSCDze9Z3AtEdGKQXYAeEsJdJifooEQlb0QUVOgwJrS9fn0+8Fka/VB//yJt3bPIsOZZJ9aektYMw3jW2JVk32qz1a6ZG1y+DhlMWX0X4MNfIOduMyJnfPuNSS5cqKdCLAvhFXMlhafW/PEzPojY0cLZnmEtOt3VfGN1X4lz6qPPpnE0JVePoqIcRd5sD4qiBGkhPBjj+/lIPeZAbpINqD/XipFzD9PK2ST1uZFFor5PeSfMzukYsh9PS2Hv0m3c/UKpvOW4Z3GxBNfzZylIGcX4bumUoxnhtyflvtlNtH9AwFmQf9ZkGt4z5O1+S3jUEbk5YNmPPUstr1pGljSzwzPFazpDJViwslexFGfyN9ri1i0kpFYdB8O3uyvvSNCyF41VGr2xqguWIdgXcJUmIgWPi/DHIff0vmrqhXcfLhp7Pt+bsDbmXGF9WR1VaHRKD88jA9jgQxc2Agjjo4gyj9cX9ELDAzpRi0Myd6Fir9AEW+cJxTz0aSi5XbbshCBZfsLqK/rvaFzgj1AF3urE0ujqtHjOP8auImIQyREbbxc6fYwdTTalVMrbyhJTZaRsdMmgP8q0T/F7kaWv7xqN+9+hv4HVm2AzOYAMcrk3e+6P8/Fi78aXXfePKjkzfnZ3uu5NYc/z/mw5RhMbgcDF6h25EeLtqNUkn/9amixX+SS1QctCe7gsnxGPb9UCGN/mU3PukBDNKQPbfLdxykzm+8oMF0cWM5qOHHYx4FnKL14P+vWxGibNTwbCxDL9ceIf0h92y94wW7fPWpsY+gSxLZ8ueusWBEM5GLLoRcD8hotdgj/dkhMMg9NlNCHBeKfpcx+LlitBs5YaPdwmkJxTCuv0DWu4AA5wXUa1pWdprei6h8Oh451//hpgYPkLSDjwqvUHOH5+4QzC0cNPK1blT49Q+tv003o8wKSA2i5NUzUjohgD2qwW+UpTdBMT/quf5MV8aufVN+ujm1oi/+zbO4Eklr1svS4jIUCWG1eWKkybKNYUUSxAzEDRSnslQ9SAO2pev1RGXvWs+56aXFiv2yG/i9GlpCZfmybxeJ9rczIsRloJj+IEXa72BsBgMwDsKAL3HrcCdcxNpXRO2j/aSNf/UD/SNHQpowK7Dv99/33pkI54wpvPXMvfsstXbvfD1lNIDLF03zzq9OSgqdT3QB72l1oAqQeNSJoN8rrrizMi7byah0l586D8/a6Y7VcZOi92vYwtVNd9UJqj5LI+hKRgzxCO9SjzpT0bO5d6y7XkMct7a7fg/xEPJbN1+KHzYd7atcF2hlqwCBSgHv9nbhXrhWHa9l3iYtZF2wEtuVmXL6ERQikBMl6P3W5U/fVIkmImaaOVHx8hgx9pA+ZZjKHG38W1EVYRaz0HNCM9ZxGl7nU2g5LwUj5QEzjRzN5j31v3AHPkjC0135Onj+wOWCLXOsucC5/MWK1Zem9lrX8W2YHEVEdcw9POBzV2qCjuewvBdoQahL9+TMT22OwVv6v6oETH7Dzd/6Sq5fCsZ6HtAh5gLmER52ZdVTs/xhUiEysT7zADEHMmqynCJLcDXghZP06PQ/MZaYIm4QZNkI7GzkmcD5giH/yhcgU9+HOa5S+nJrx6ib9XWw4einUrSTfrILwtjQx63j8uSfU7X+81KiF5JnAQIk7ZlGIu7p27gSZG3R3qAgpSM7fSh2gOil90xXNYpHQTQ9iXBRnFpyaARltyXy6bBuQyJTpUgsP+XvGDrB8jngratTnXAlWyenq3H1dk1dPtu5vVG6JUDLcHPDnCGh2pu7Uond9xPSAAIeU5gt7Llxn873aUu1cDRuG4WELCpSjKmOsbZSacqb/xhLiLqSxCPR1PRnX23ztPeSp37ez7c0E/oHnXN1MxV3OdCM9NdP9M78Bt4k3G8noE5R3pQWWKKFuA7jnRrsvjgxVZMfjEC9jQAoDeoDE30bm1vkvoGi9xfRA6KFHmS2WgdXHrbXY1LJrxiwO3Nzeyb/F119K4vboWymsHKCyJNMPQWyYPublzqF5/x1AeNahdM71ktN2qGsndw0gRUjMdAhVhv1vqFq/vsJljtE/+MYA1KDJE6NoHpj6HY4gO1TA4Y6jDFBjiUXl73A31mPDfCnH9u0Up1gfdiq7nqrziFfjxPQrcSviQ5NdXra89uXKvOw+YWR/ROSjNQ49ylCY76tweMgHVyl5nDvM+OC1cjUJf4nAC2973n7ePeWpY9JgAdXREfYBEOi+YbeikqXpHlmkX8QYvrp9gY91nZEGDTdHvMoR0Ze6o/nx1c7w3igTKlZDRhwMrc8z2XTRrYTBAD99VUiOG6zQda3QdyK/8CiBgTlo8tKUbcF/dyEFhiAKlTQaKoyZ66SOWMcvMiOn7zM1EBtf60+hdp/CFk8y3om3NDeW/jm6ODMhlSLtlxmzuFaOGnG+rGBwoh6T31egKkQai8fuwArMM0AIV2/d9uE1e2uQkLWiLxP/gwGSg78BmH0DizuFU9/1goilvVz83Ke0yhoAOi3jVB2e3C8G2pnG8KQGc0rTg8Pz+dXayUCcWG2e/W+nl9e7ABZpZC0E7BwkgqX+UWRWjdOtTz3Gy6HmS7fVNlsbxb9uGhYyqS2psHVkw0W3jDIbjY2cZfrU7OBT36LJHIR/VeMhzYlyacVRvFwEOFtj8k9q052Kbrtwp5y2EjfrgYf7mprz/Db+KwM7SQJMGFWNmHyvPNW8GS8YlwWdARAxeCaUKKAOSKAYrRa49ZuCTOqNy7LcXYnuPMMcpjOO10bt7DtIRCxRWw6o1cqDYQ0JQjDNNrNxjZ0BEXbTJ+hY9N+4uBEDxufvajZOPMaOsAw/8BftWmALCg/4vrtaXQRzsZabk3+oEAO6V0GzkeIlNCOhOgj16EVvjZkIRLUTpDhmvDqzT1c792AQQbcMcHK24OpHYc2WgzaRrn2bsCYNG9iPobdn4nT2sShfhAq+gQ7rn/z/2QgUSzzT+Ld8kRFODgepr+/WS/i2OdwEYRnuOL1KGC7XCA45RCLw4u/6lEpUkOw4Cf8k25vTrtq+wuGVf7QeUvVcozEZJk79dXDnQQorUjoaf6rCYa/OdwV1/21oxOrqG6APcBU9mOm4TS2DvyJ5lYPdBEozvILl2J9FY6pkEsAShSeY55g11SX51+ePnKlkkAwuc60ka1IW2DNAHg59+5MG9OUX3oXDudBeymVNCO/qny0JGc+vtrePcx1e9oXbK9Uh3LhyOO32y2AVoYWBassrtUlN//1iiNi3M7z0WWwjUbsaU/OBDAHsVSArzgPMr37R0DJ2w+wsOYHRhSgU/ZU2euPKwi2PMyIZ7k621VMowIwVJa4ATM/oAAZeSD0PjwgjaJ7PtGW8fWlKL9QJWK+cJ553552gPMmv9RMpMe72+rqIIkEOaq2He6zuvU7J9+NLuXvUeuV3ON2/SS+NvtVc7Il3+3B5tn/TaC32sLHZNfyIOLwJPpMsLgHAgnMxOJPUtU+RQIND3+GkfDjTb9uEtXqzIl8wHGDwIchMcdrGcShs/bl3RVKe4JkgAszG3vc6IL5YVmsM88oB1aH+ptwg6HyiaEoETRRR2Kb0h4Bw+UohDE9IE5VoqeDg7ZnX2pP5qzjMri42aJuudZ/JwVkT871xkIfB8uYY1l8Cu/PHCMOA8if6cOMPtUR9bewjYEGBeWO4w4+1O0pyPVhCoc3bO1olkJ6lC/QSsgWuj/dZ/fBuqTQGdZ19syxvI4tXwi031uOIMfr3RUDBp/jRr6Pz17/Pr97e7iiS2+qbP1mlfTRLegmEiF+yOFGAwa/v997zaJqerhQ3oVerKEpqMnD3hC/7I3+rz1taefhQJplYPtKuYsS+jHpjF/8LZSnf0OZ5b0JR5ZngnTbUfbbghnYziV0xzwS1bERpe7lGbFq6pmvP1u5j3Wnwv2zGqxJ0jR6UM0eo9Jvu7nWb0gVsspbzil24m7kjWgn3uyJJjsdSavHiaO1Ws/4vKQMw6ejAYokA9sh6b2jy5GfOT8bbeiTDbNM9THmehCCC5osxeFfLaONLeQSNvQNk5qlFseJJtnS10/RIIu5EIuqmrJrwAh0Ia/rrM+KL1+ZgmfrF5X8b8fzfXDA8LQHK+0jNwoysU/t64I/H6xLy/xBWm1QKrnj4Yb7VCbkcf0BANs6GfosnfFw7DCoZpx8YIT0AMQYgcA0dL0NwwQ0Z+V51DZHFaujQUuu1PvvDlMR2qwASl0CwQZ0wsBI6thXLeCyYYwIOdttByBL2Olg2HiusBNsGp84kCBe08WIuwl8qj5gDX7MM2pvv70OQoEkfRfgfEUs1yDnd5+fmr8KWIyGRIdVOQp3SXM6+Bg74FqupeCg5elkw1CNAszfzIvQAwUMQF+LlYG9e3PgAqCBL8QB5Ro16RPo4pCbf0hu9Hf9p4PByCMte4JlIjxseu1wUojgC3ltSP8zSpmDeLir5kL7aL/Nefj2lcHRYjAtWLAHJJAumYRhIl3g8FFJpcoC/71stbbA4GPIXX6SR1OYIyMi3T43PSatwzGcmz5Ik/Y2AdMLY7LbYiJCBMM0qiZfFOLOZ/M/CQg9Rx/JbgVFCEXEn0fCkywO3zlPqc2f8mDu8G1ZpEOu/+J5GnJ2ECrXKZBF/RrDCAFsiosPKMZkPuNvDfwNBvalBGvV14wI6z5zf7ktW8q1uvD2rpk9/eQaymYiPOwt508+wbbiASuvufkVwAQLpChqPrjVaQWHaN4elQtlNw3jesgcQdTR/8+h+HT4GWoeW/7xU/CSE30y3Gdtg95y3vGTARoA90kYMbxHq/WY1lc+X/gFqjOyqoCzDdgZaqLJRBEEUjBNFMpFf8Iskvzk/D4O1StmB/OMrKHTyAB8JDr/NRuQGda4BuaJezpjZg+YvMKN0SqyU3zBJj/YHM217wwdZtaAzLy+hCzCQWpu7o98VgTw5Aftc+Ihh+8YFrXQXHzpL5pWXsVTyyj+0FTUcZhYIS+PpN1Aw6ohkqhLVL3c6EC01d6dkO9eo4MnOqhH62JnTzt/Sl8Psy7kee+qgfMDw1lrTXaoj/wd8pfAEpDr89en8nGjfc6W/i14PbTqOePZsBlalRa0G8amScgbjMu2GxNYDLU7iJdAEwBV34uoAwbi/Y4SDu6Zvn3/GEV0avsKsnugysLYjKX7QHT6jj5hNsogApOk/hCBRw4wFqPZ4OU72SpBXGwnJjFanSC/uqOAzfh0qnL1PLdbimtmfU8latFcua0dIwL1LF7fwAsoBotaNgHprBr7nlM+xaex6h77rJl+2JuF2cC4ezHoE1j6xRP1hD2gx9wjYjnjN9KKtlQvLE4yEIxx4QF57ZjkWVB0q1mxIDGyJHKxcKiUbIbTubXM2NFMQIGMHKyKmPxWjSuFaVPfU4RQPB2jQS4FB1k60WeIk0de9uRuMGAx/Tm9dw/dfHp+vE5Ywip3aDcczqpa0O1XTrh/ylhvX3n+xdxic+hoS9p1grHnPiQYhV8mM8V+vbeZoSx4nEtl7jMdAQRZFSyWkpuJxe+mAq33mGWjpJhZmRMEtmGy7uxR0ugCOCKYWfZPsmnzScZ31IBd93n8D47xXyTwy+YpaLeRZ47rx58AIBd//M4GyreS69tC+xdtSXTg/BgyRR3/Dh9yNrvA9ode/NsQCyQk1FsfHhdsxtOkv9fxKqUIGam/HilD4WDxHvZPugSD84TgcCdNixtwRTwlMsP4B5qRGaRvAa79j3L+7U4mSnLHA77tW4x4Iuow7SK11+UcSkUeOKfi+AW9HZ6I645MD/C6R5bSBBogzTaj41GtVaVHe1m6FjxOvj8vSrijQACyVZfYBPVOd+zsBFkmHhHCJHU9JiStTJ39VSA7a+6OG5YMWhoGIjBMmY6cSMuk39JdFe8hZeDtHsPvUZZYi1MbfRtNX4EUFL6m8ioQyxMqJ5gjJgmBOn5wsllK32A6Gt89hBPzoO5f+Ts45IxhwzL40Fotuv4LoH9GiZfatF3azVcUOB1cHizQALyZ/dG5RE9MV6wCnqEVLQ/uh4raEP9if68jA+2DN8H7lbiaKQQiNeeWKfXHLvOTq976b5tuWIrVR5aIqlQYZ9OKGely4WMTcT/FUv8c6J7m6njqsr42/ZTTC3Fpt5HpxYW07AA7b+AecXakssoSsyJw5HCQbi1Jc+rgxz8nyoOG/NwgEI76eD9d5PQjZSvLtl5fqgF14IK46OL3y2S6NgRetn4wtyTDlr4J4lxE6rbEIc5eeqcVueOnpCM6CSCuTfWTEWfqjQT7aj2MF4QtrtqXngC6smHjHEth05KaMCAIN7VPGgt7tlut24PDPNvid2FRkqTClIOo8luIpt7jsrx4XsUlRMQ+GFF+4HnNjb7oglVd9PKJ/C8KMui9Y/X0nAx0c5sw7barOt3+kV9ynzFUxzZKwS+Q0/waTeTUnHYymIL2g1ASufk2CnqlwadeHoOOeFJ2YDEGYoYJnyEklIZ/J3erg3H2eIPM3OOBKX60eeOTXgSeCRDAauhwtQgz91iZT4fUwxG+yXjFzUtqJ/kDXyLx/Z/B2hxOyzKJ0odChoC7Bfg+1ZBttXLdUYDyGvEzFvBSi7VVGbmb8mNd0+7sp9JDY9nDKgMzxfmoDcxdTtcR/iWD62k7Sk1atwV1HLB+llkGDE85M1rhN8yo0dZaSFEOR+SaC4FXjscKdR2V+LIDcwzubzRwfIbb7062eD5cbtnaVtno2IBJstxW5vC0wKrEY75zJGNc7PPJJCVMn7MuNa5qt6FFhHNqj1RmFrd1qf60qQMmQqzR03ZzlGSwuS1toVmMgHcja3fqdBabUCwSddDw7Gi29fuexLxitvLsfDEsPHLW+plQ5Bfg2qNMtYqjb0ptP38sETpssLoJBVn7wMOjkZ6RsN35ExI5Xa9TrNyAJgyGQwzD6PYd2Tncw6L3kUlqgc8TjMSQkKibmECIWOQMvs30rm0+87uMi4kL1+b2kelXSrSwsF4AAA4A4h8FB92v/VrWh7e5GbcoNO03t3VKzZAZOUCJhV6RZkNKMWGMkGm+/+5nSUOUScqLvHfjA3EdQ7lLkeiC14SbEMUUqT7GCrqWShAH0OhEPwu8RoMAOsvplxb32v3kX1gJf3EvMorUuxUW0BTw8KURZSsXOf5wGW0XhUNHSrK+RIIPHXHoks5wQIK+Izj2guBK1w1VM9tTCnVCPuBch0acMdqbTMDBZJoosIGB94WjC9ee+vkQroow+hZ8QPWhTznPyZ4NkllorMejNr/tFZGZUT/vAzjfmMzga7IgFiavIDimaQUbwEo5opBAFR7tLdovFC9jJGZvvhHoI8sS5rbM1PbGrqFmogs0lfKvVeIZQMYrhkredKsg2YYZLymS4lqYapN/WHVF0JKCaOSAK+1T8AvG0YmmwGoWwq3wrBhlXL2NrmxYGghoXtUFEUlS5PKqRmEyArPSvOGdNs4j8UKkD4wKYi1VDhUHW4ZPTwc8r3RN58wPPKriVEXJZ6Z4W/QApvqqVvY8/aaIx4liUxogsuXTeKMv7EE5mQWC/gaFBIIRhdeNvnpL7EFGonPnLol0qiihaNhtAF97VmFgiwwdZsfyjqONPXpOvih+vuVuTYWduvi3IhA6PrA1Q5mDywdzY0WPIj8SOWzHtP9bW01UjJ9mPsDDps5d+h381jYuLRBWvPl371XjSNf6QVsILkJ9oWeOnhpA66VmHMfC+qhrH6q5b/0uQp/8XHopYqnXb/W/dTY6nbTztPNqsXJbSZuqujzDzARJKFM4BYZ4GbgQmrHmizqgXCIpQMsXAiKx2FMjNilNlz9h7a64N4W0C4oAk8vI+ReCWeL6T048NAHRFFc5TF6s2RRishL73sfpvsyydrprBzIa9weXfifxQAek3Q92T7lxVkArMwjO5dXnhjLxkcAADhsc55nvXrNhtx7YMcF4Y2AJGkjaCZoIPAI3KRPDxN6Zp55jh3t4uF+tHL7eaV0OQHGWHwyfcpCd62ZDxkqlg9NP/nhBodGc2ACo0AAAAA==";

const STATUS_PAGE_URL = "https://status.ankerd.org";

function page({ appName, code, title, detail }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${title} — ${appName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Poppins:wght@400;500;600;700&display=swap">
<style>
  :root {
    --paper: 245 248 249; --ink: 15 21 25; --ink-2: 74 90 99; --ink-3: 116 131 138;
    --line: 213 222 226; --outline: 15 21 25; --brand: 87 178 249; --brand-text: 13 117 209;
    --amber-bg: 254 243 199; --amber-fg: 146 64 14;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper: 13 18 22; --ink: 230 240 243; --ink-2: 160 176 184; --ink-3: 110 126 134;
      --line: 36 48 57; --outline: 191 211 218; --brand-text: 137 202 254;
      --amber-bg: 66 46 8; --amber-fg: 252 211 77;
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0; min-height: 100dvh; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 0; background: rgb(var(--paper)); color: rgb(var(--ink));
    font-family: "Poppins", "Segoe UI", system-ui, -apple-system, sans-serif;
    padding: 3rem 1.5rem; text-align: center;
    padding-top: max(3rem, env(safe-area-inset-top, 0px));
    padding-bottom: max(3rem, env(safe-area-inset-bottom, 0px));
  }
  .wrap { display: flex; flex-direction: column; align-items: center; max-width: 340px; }
  img.logo { width: 64px; height: 64px; object-fit: contain; margin-bottom: 1.25rem; }
  .badge {
    display: flex; height: 48px; width: 48px; align-items: center; justify-content: center;
    border-radius: 12px; background: rgb(var(--amber-bg)); color: rgb(var(--amber-fg));
    font-family: "Big Shoulders Display", "Arial Narrow", sans-serif; font-weight: 900;
    font-size: 20px; letter-spacing: 0.02em;
  }
  h1 {
    margin: 1rem 0 0; font-family: "Big Shoulders Display", "Arial Narrow", "Impact", sans-serif;
    font-weight: 900; text-transform: uppercase; font-size: 34px; line-height: 0.95; letter-spacing: 0.01em;
  }
  p { margin: 0.75rem 0 0; max-width: 300px; font-size: 14px; line-height: 1.5; color: rgb(var(--ink-2)); }
  .code {
    margin-top: 1.75rem; font-family: "Poppins", sans-serif; font-weight: 600; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.08em; color: rgb(var(--ink-3));
    border: 1.5px solid rgb(var(--line)); border-radius: 999px; padding: 6px 14px;
  }
  .code b { color: rgb(var(--ink)); font-weight: 700; }
  a.status {
    margin-top: 1.75rem; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px;
    font-weight: 600; color: rgb(var(--brand-text)); text-decoration: none;
  }
  a.status:hover { text-decoration: underline; }
  button {
    margin-top: 1.5rem; border: 2px solid rgb(var(--outline)); background: rgb(var(--brand));
    color: rgb(15 21 25); font: inherit; font-weight: 600; font-size: 14px; border-radius: 12px;
    padding: 10px 18px; cursor: pointer;
  }
  button:active { opacity: 0.9; }
</style>
</head>
<body>
  <div class="wrap">
    <img class="logo" src="${LOGO_DATA_URI}" alt="" draggable="false">
    <span class="badge">${code}</span>
    <h1>${title}</h1>
    <p>${detail}</p>
    <div>
      <button type="button" onclick="location.reload()">Probeer opnieuw</button>
    </div>
    <p class="code">Foutcode <b>${code}</b> · ${appName} is niet bereikbaar via Cloudflare</p>
    <a class="status" href="${STATUS_PAGE_URL}" target="_blank" rel="noopener noreferrer">Bekijk de serverstatus →</a>
  </div>
</body>
</html>`;
}

function errorResponse(site, code, isHtmlRequest) {
  const [title, detail] = KNOWN[code] || FALLBACK;
  if (!isHtmlRequest) {
    // An API/asset request: keep it small and machine-readable, matching the
    // shape the backend's own errors use ({"detail": "..."}), so the app's
    // existing error handling (ApiError, ServerUnreachable) degrades the way
    // it's designed to instead of trying to parse an HTML page as JSON.
    return new Response(JSON.stringify({ detail: `${title} (${code}). ${detail}` }), {
      status: code,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return new Response(page({ appName: site.appName, code, title, detail }), {
    status: code,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const site = SITES[url.hostname];
    // A hostname this worker isn't configured for (shouldn't happen if the
    // Worker Route is scoped correctly) — get out of the way entirely.
    if (!site) return fetch(request);

    const isHtmlRequest = (request.headers.get("accept") || "").includes("text/html");

    let response;
    try {
      response = await fetch(request);
    } catch (err) {
      // The origin could not be reached at all — connection refused, DNS,
      // TLS, or a timeout. This is what Cloudflare's own 521/522/523 pages
      // cover; whether this catch actually fires (instead of Cloudflare
      // answering before the worker's own fetch gets a chance to fail) can
      // depend on exactly how the failure happens — see the caveat in
      // docs/cloudflare-error-page.md. 502 is the closest accurate status
      // for "this gateway (worker) got no usable response from upstream".
      return errorResponse(site, 502, isHtmlRequest);
    }

    if (response.status >= 500 && response.status <= 599) {
      return errorResponse(site, response.status, isHtmlRequest);
    }

    return response;
  },
};
