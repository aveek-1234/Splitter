import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://clerk.splitterhub.cloud/.well-known/jwks.json'));

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname.toLowerCase();
		const ip = request.headers.get('cf-connecting-ip') || 'unknown';

		function isStaticAsset(path: string) {
			return (
				path.startsWith('/_next') ||
				path.startsWith('/static') ||
				path.startsWith('/images') ||
				/\.(css|js|png|jpg|jpeg|svg|ico|woff|woff2|webp|avif|gif)$/.test(path)
			);
		}

		// if (isStaticAsset(path)) {
		// 	const cleanHeaders = new Headers(request.headers);
		// 	cleanHeaders.delete('cookie');
		// 	cleanHeaders.delete('authorization');
		// 	const assetRequest = new Request(request, {
		// 		headers: cleanHeaders,
		// 	});

		// 	return fetch(assetRequest, {
		// 		cf: {
		// 			cacheEverything: true,
		// 			cacheTtl: 2592000, // 1 month
		// 		},
		// 	});
		// }

		if (isStaticAsset(path)) {
			const cleanHeaders = new Headers(request.headers);

			cleanHeaders.delete('cookie');
			cleanHeaders.delete('authorization');

			const assetRequest = new Request(request, {
				headers: cleanHeaders,
			});

			const response = await fetch(assetRequest, {
				cf: {
					cacheEverything: true,
					cacheTtl: 2592000,
					cacheKey: request.url,
				},
			});

			const newResponse = new Response(response.body, response);

			newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

			return newResponse;
		}

		const isInngestRequest = request.headers.get('x-inngest-signature') || request.headers.get('x-inngest-sdk');

		if (isInngestRequest) {
			return fetch(request);
		}

		// -------------------------
		// 🚨 Bot / attack detection
		// -------------------------
		const suspiciousPatterns = ['/wp-admin', '/wp-login', '/xmlrpc.php', '.env', '.git', 'setup-config.php'];

		if (suspiciousPatterns.some((p) => path.includes(p))) {
			console.log(`🚨 Blocked suspicious request from ${ip}: ${path}`);
			return new Response('Blocked', { status: 403 });
		}

		// -------------------------
		// 🍪 Extract Clerk session
		// -------------------------
		const cookieHeader = request.headers.get('cookie') || '';

		const token = cookieHeader
			.split(';')
			.map((c) => c.trim())
			.find((c) => c.startsWith('__session='))
			?.split('=')[1];

		// -------------------------
		// 🌍 Public routes
		// -------------------------
		const publicRoutes = ['/', '/sign-in', '/sign-up', '/api/inngest'];

		const isPublic = publicRoutes.some((route) => path === route || path.startsWith(route + '/'));

		// -------------------------
		// 🔐 Protect everything else
		// -------------------------
		if (!isPublic) {
			if (!token) {
				return Response.redirect(new URL('/sign-in', request.url).toString());
			}

			try {
				const { payload } = await jwtVerify(token, JWKS, {
					issuer: 'https://clerk.splitterhub.cloud',
				});

				// ✅ Properly clone request with new headers
				const newHeaders = new Headers(request.headers);
				newHeaders.set('x-user-id', payload.sub as string);

				const newRequest = new Request(request, {
					headers: newHeaders,
				});

				return fetch(newRequest);
			} catch (err) {
				console.log(`❌ Invalid session from ${ip}`);
				return Response.redirect(new URL('/sign-in', request.url).toString());
			}
		}

		// -------------------------
		// 🚀 Public → pass through
		// -------------------------
		return fetch(request);
	},
};
