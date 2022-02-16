/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-snuggery-workspace",
factory: function (require) {
var plugin=(()=>{var pe=Object.create,W=Object.defineProperty;var le=Object.getOwnPropertyDescriptor;var fe=Object.getOwnPropertyNames;var de=Object.getPrototypeOf,ue=Object.prototype.hasOwnProperty;var me=r=>W(r,"__esModule",{value:!0});var l=r=>{if(typeof require!="undefined")return require(r);throw new Error('Dynamic require of "'+r+'" is not supported')};var ge=(r,e)=>{for(var n in e)W(r,n,{get:e[n],enumerable:!0})},he=(r,e,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let c of fe(e))!ue.call(r,c)&&c!=="default"&&W(r,c,{get:()=>e[c],enumerable:!(n=le(e,c))||n.enumerable});return r},f=r=>he(me(W(r!=null?pe(de(r)):{},"default",r&&r.__esModule&&"default"in r?{get:()=>r.default,enumerable:!0}:{value:r,enumerable:!0})),r);var Ee={};ge(Ee,{default:()=>ke});var ie=f(l("@yarnpkg/cli")),o=f(l("@yarnpkg/core")),E=f(l("@yarnpkg/fslib")),Y=f(l("@yarnpkg/plugin-pack")),q=f(l("clipanion"));var D=f(l("@yarnpkg/core")),L=f(l("@yarnpkg/fslib")),N=f(l("@yarnpkg/plugin-essentials")),re=f(l("semver"));function G(r,e,n){return Object.create(r,{cwd:{value:e,writable:!1,configurable:!0},manifest:{value:D.Manifest.fromText(JSON.stringify(n)),writable:!1,configurable:!0}})}function se(r){return L.xfs.mktempPromise(async e=>{let n=new L.CwdFS(e);return await D.tgzUtils.extractArchiveTo(r,n,{stripComponents:1}),D.Manifest.fromText(await n.readFilePromise(D.Manifest.fileName,"utf8"))})}var oe="npm:";function X({range:r}){if(r.startsWith(oe)&&(r=r.slice(oe.length)),/^[a-z]+:/.test(r)||r.includes("||")||r.includes("&&")||!D.semverUtils.validRange(r))return N.suggestUtils.Modifier.EXACT;switch(r[0]){case"^":return N.suggestUtils.Modifier.CARET;case"~":return N.suggestUtils.Modifier.TILDE;default:return N.suggestUtils.Modifier.EXACT}}function ne(r,e){let n=X(e);if(n!==N.suggestUtils.Modifier.EXACT)return N.suggestUtils.applyModifier(r,n);let{protocol:c,source:M,selector:p,params:w}=D.structUtils.parseRange(r.range),k=/^\s*>=\s*0\.(\d\d)\d\d(?:.[^ <]+)?\s*<\s*0\.(\d\d)00(?:\.0)?\s*$/.exec(e.range),T=/^0\.(\d\d)\d\d(?:\.\d+)?$/.exec(p);return re.valid(p)&&T!=null&&k!=null&&+k[2]==+k[1]+1?D.structUtils.makeDescriptor(r,D.structUtils.makeRange({protocol:c,source:M,selector:`>= ${p} < 0.${T[1]}00.0`,params:w})):r}var B=class extends ie.BaseCommand{constructor(){super(...arguments);this.json=q.Option.Boolean("--json");this.directory=q.Option.String({required:!0})}async execute(){let e=await o.Configuration.find(this.context.cwd,this.context.plugins);return(await o.StreamReport.start({configuration:e,stdout:this.context.stdout,includeFooter:!1,includeInfos:!0,json:this.json},async c=>{let{project:M,workspace:p}=await o.Project.find(e,this.context.cwd);if(!p){c.reportError(o.MessageName.UNNAMED,"Couldn't find workspace");return}if(p.manifest.name==null){c.reportError(o.MessageName.UNNAMED,`Package at ${o.formatUtils.pretty(e,p.relativeCwd,o.FormatType.PATH)} doesn't have a name`);return}let w=E.ppath.join(M.cwd,"dist");await E.xfs.mkdirPromise(w,{recursive:!0}),await M.restoreInstallState();let k=E.ppath.join(w,`${o.structUtils.slugifyIdent(p.manifest.name)}.tgz`),T=E.ppath.resolve(p.cwd,E.npath.toPortablePath(this.directory));if(!await E.xfs.existsPromise(T)){c.reportError(o.MessageName.UNNAMED,`Build package ${o.formatUtils.pretty(e,p.manifest.name,o.FormatType.IDENT)} first`);return}let P=await E.xfs.readJsonPromise(E.ppath.join(T,E.Filename.manifest)),R=o.structUtils.parseIdent(P.name);if(R.identHash!==p.anchoredDescriptor.identHash){c.reportError(o.MessageName.UNNAMED,`Invalid distribution folder: found package ${o.formatUtils.pretty(e,R,o.FormatType.IDENT)} but expected ${o.formatUtils.pretty(e,p.anchoredDescriptor,o.FormatType.IDENT)}`);return}let I=G(p,T,P),b=await Y.packUtils.genPackStream(I,await Y.packUtils.genPackList(I));await E.xfs.writeFilePromise(k,await o.miscUtils.bufferStream(b)),c.reportInfo(null,`Packed ${o.formatUtils.pretty(e,R,o.FormatType.IDENT)} into ${o.formatUtils.pretty(e,k,o.FormatType.PATH)}`)})).exitCode()}};B.paths=[["snuggery-workspace","pack"]];var ae=f(l("@yarnpkg/cli")),a=f(l("@yarnpkg/core")),j=f(l("@yarnpkg/fslib")),H=f(l("@yarnpkg/plugin-npm")),K=f(l("clipanion"));var _=class extends ae.BaseCommand{constructor(){super(...arguments);this.tag=K.Option.String("--tag","latest");this.json=K.Option.Boolean("--json")}async execute(){let e=await a.Configuration.find(this.context.cwd,this.context.plugins);return(await a.StreamReport.start({configuration:e,stdout:this.context.stdout,json:this.json,includeInfos:!0},async c=>{let{project:M,workspace:p}=await a.Project.find(e,this.context.cwd);if(!p){c.reportError(a.MessageName.UNNAMED,"Couldn't find workspace");return}if(p.manifest.name===null||p.manifest.version===null){c.reportError(a.MessageName.UNNAMED,"Workspaces must have valid names and versions to be published on an external registry");return}let w=p.manifest.name,k=j.ppath.join(M.cwd,"dist",`${a.structUtils.slugifyIdent(w)}.tgz`);if(!await j.xfs.existsPromise(k)){c.reportError(a.MessageName.UNNAMED,`Pack package ${a.formatUtils.pretty(e,w,a.FormatType.IDENT)} first`);return}let T=await j.xfs.readFilePromise(k),P=await se(T);if(P.name==null||P.name.identHash!==w.identHash){c.reportError(a.MessageName.UNNAMED,`Tarball for package ${P.name&&a.formatUtils.pretty(e,P.name,a.FormatType.IDENT)} cannot be published in workspace for ${a.formatUtils.pretty(e,w,a.FormatType.IDENT)}`);return}let R=H.npmConfigUtils.getPublishRegistry(P,{configuration:e}),I=await H.npmPublishUtils.makePublishBody(G(p,p.cwd,P.raw),T,{access:void 0,tag:this.tag,registry:R});try{await H.npmHttpUtils.put(H.npmHttpUtils.getIdentUrl(w),I,{configuration:e,registry:R,ident:w,jsonResponse:!0})}catch(b){if(b.name!=="HTTPError")throw b;{let F=b.response.body&&b.response.body.error?b.response.body.error:`The remote server answered with HTTP ${b.response.statusCode} ${b.response.statusMessage}`;c.reportError(a.MessageName.NETWORK_ERROR,F)}}c.hasErrors()||c.reportInfo(null,`Published ${a.formatUtils.pretty(e,a.structUtils.makeDescriptor(w,P.version),a.FormatType.DESCRIPTOR)}`)})).exitCode()}};_.paths=[["snuggery-workspace","publish"]];var z=f(l("@yarnpkg/cli")),t=f(l("@yarnpkg/core")),x=f(l("@yarnpkg/fslib")),$=f(l("@yarnpkg/plugin-essentials")),V=f(l("@yarnpkg/plugin-npm")),O=f(l("clipanion")),A=f(l("semver"));var ye="migrations.json",J=class extends z.BaseCommand{constructor(){super(...arguments);this.patterns=O.Option.Rest()}async execute(){let e=await t.Configuration.find(this.context.cwd,this.context.plugins),{project:n,workspace:c}=await t.Project.find(e,this.context.cwd),M=await t.Cache.find(e);if(!c)throw new z.WorkspaceRequiredError(n.cwd,this.context.cwd);await n.restoreInstallState();let p=[$.suggestUtils.Strategy.PROJECT,$.suggestUtils.Strategy.LATEST],w=[],k=[],T=e.get("defaultProtocol"),P=s=>{let m=t.structUtils.parseRange(s.range);m.protocol||(m.protocol=T,s=t.structUtils.makeDescriptor(s,t.structUtils.makeRange(m)));let i=n.storedResolutions.get(s.descriptorHash);if(i==null)throw new Error(`Assertion failed: expected ${t.structUtils.stringifyDescriptor(s)} to be resolved`);let d=n.storedPackages.get(i);if(!d)throw new Error(`Assertion failed: expected ${t.structUtils.stringifyDescriptor(s)} to be installed, try running an installation`);return d};for(let s of this.patterns){let m=!1,i=t.structUtils.parseDescriptor(s);for(let d of n.workspaces)for(let v of[$.suggestUtils.Target.REGULAR,$.suggestUtils.Target.DEVELOPMENT]){if(!d.manifest.getForScope(v).has(i.identHash))continue;let h=d.manifest[v].get(i.identHash);if(typeof h=="undefined")throw new Error("Assertion failed: Expected the descriptor to be registered");w.push(Promise.resolve().then(async()=>[d,v,h,await $.suggestUtils.getSuggestedDescriptors(i,{project:n,workspace:d,cache:M,target:v,modifier:X(i),strategies:p})])),m=!0}m||k.push(s)}if(k.length>1)throw new O.UsageError(`Patterns ${t.formatUtils.prettyList(e,k,t.FormatType.CODE)} don't match any packages referenced by any workspace`);if(k.length>0)throw new O.UsageError(`Pattern ${t.formatUtils.prettyList(e,k,t.FormatType.CODE)} doesn't match any packages referenced by any workspace`);let R=await Promise.all(w),I=await t.LightReport.start({configuration:e,stdout:this.context.stdout,suggestInstall:!1},async s=>{for(let[,,m,{suggestions:i,rejections:d}]of R){let v=i.filter(h=>h.descriptor!==null);if(v.length===0){let[h]=d;if(typeof h=="undefined")throw new Error("Assertion failed: Expected an error to have been set");let y=this.cli.error(h);n.configuration.get("enableNetwork")?s.reportError(t.MessageName.CANT_SUGGEST_RESOLUTIONS,`${t.structUtils.prettyDescriptor(e,m)} can't be resolved to a satisfying range

${y}`):s.reportError(t.MessageName.CANT_SUGGEST_RESOLUTIONS,`${t.structUtils.prettyDescriptor(e,m)} can't be resolved to a satisfying range (note: network resolution has been disabled)

${y}`)}else v.length>1&&s.reportError(t.MessageName.CANT_SUGGEST_RESOLUTIONS,`${t.structUtils.prettyDescriptor(e,m)} has multiple possible upgrade strategies; are you trying to update a local package?`)}});if(I.hasErrors())return I.exitCode();let b=[],F=e.makeResolver(),Q=new Map,Z=new Map,ee=async s=>{let m=await V.npmHttpUtils.get(V.npmHttpUtils.getIdentUrl(s),{configuration:e,ident:s,jsonResponse:!0}),i="version"in s&&s.version?s.version:A.clean(t.structUtils.parseRange(s.reference).selector),d=m.versions[i];if(d==null)throw new Error(`Assertion failed: version ${i} not found in registry`);return d},te=await t.LightReport.start({configuration:e,stdout:this.context.stdout,suggestInstall:!1},async s=>{var m;for(let[i,d,,{suggestions:v}]of R){let h=v.find(g=>g.descriptor!=null).descriptor,y=i.manifest[d].get(h.identHash);if(typeof y=="undefined")throw new Error("Assertion failed: This descriptor should have a matching entry");if(y.descriptorHash===h.descriptorHash)continue;let U=Q.get(h.descriptorHash);if(U==null){let g=await F.getCandidates(h,new Map,{project:n,report:s,resolver:F});if(g.length===0)throw new Error("Assertion failed: candidate has to be found");let u=(m=(await ee(g[0]))["ng-update"])==null?void 0:m.packageGroup;Array.isArray(u)?U=u.map(S=>t.structUtils.makeDescriptor(t.structUtils.parseIdent(S),h.range)):typeof u=="object"&&u!=null?U=Object.entries(u).map(([S,ce])=>t.structUtils.makeDescriptor(t.structUtils.parseIdent(S),`${ce}`)):U=[h];for(let{descriptorHash:S}of U)Q.set(S,U)}for(let g of U){let C=i.manifest[d].get(g.identHash);if(C==null)continue;i.manifest[d].set(g.identHash,g);let u=i.manifest.peerDependencies.get(g.identHash);u!=null&&i.manifest.peerDependencies.set(g.identHash,ne(g,u)),b.push([i,d,C,g]),Z.set(P(C),g)}}});return te.hasErrors()?te.exitCode():(await e.triggerMultipleHooks(s=>s.afterWorkspaceDependencyReplacement,b),(await t.StreamReport.start({configuration:e,stdout:this.context.stdout},async s=>{await n.install({cache:M,report:s,mode:t.InstallMode.UpdateLockfile}),await s.startTimerPromise("Preparing migration",async()=>{var d,v,h;let m=x.ppath.join(n.cwd,ye),i=new Map;if(await x.xfs.existsPromise(m))for(let y of await x.xfs.readJsonPromise(m))i.set(t.structUtils.parseIdent(y.package).identHash,y);for(let[y,U]of Z){let g=P(U),C=t.structUtils.stringifyIdent(y);if(!((d=(await ee(g))["ng-update"])==null?void 0:d.migrations))continue;let u=i.get(y.identHash);u!=null?(y.version&&A.lt(y.version,u.from)&&(u.from=y.version,delete u.includedMigrations,delete u.skippedMigrations),g.version&&A.gt(g.version,u.to)&&(u.to=g.version,delete u.includedMigrations,delete u.skippedMigrations)):(u={package:C,from:(v=y.version)!=null?v:"unknown",to:(h=g.version)!=null?h:"unknown"},i.set(y.identHash,u))}i.size&&await x.xfs.writeJsonPromise(m,Array.from(i.values())),s.reportInfo(null,`Changes have been made to the ${t.formatUtils.pretty(e,x.Filename.manifest,t.formatUtils.Type.PATH)} files and to ${t.formatUtils.pretty(e,x.Filename.lockfile,t.formatUtils.Type.PATH)} and the new packages have been downloaded, but no packages have been installed yet into ${t.formatUtils.pretty(e,x.Filename.nodeModules,t.formatUtils.Type.PATH)} or ${t.formatUtils.pretty(e,x.Filename.pnpCjs,t.formatUtils.Type.PATH)}.`),s.reportInfo(null,`You can add extra migrations by executing ${t.formatUtils.pretty(e,"`yarn sn run update <package@version> [...package@version]`",t.formatUtils.Type.CODE)} again.`),s.reportInfo(null,"If you are ready to apply the update, continue with the instructions below."),s.reportInfo(null,`First, check whether everything looks okay and perform the actual installation via ${t.formatUtils.pretty(e,"`yarn install`",t.formatUtils.Type.CODE)}`),i.size&&s.reportInfo(null,`Then, continue with executing the migrations. Run ${t.formatUtils.pretty(e,"`yarn sn help update`",t.formatUtils.Type.CODE)} for instructions.`)})})).exitCode())}};J.paths=[["snuggery-workspace","up"]];var we={commands:process.env.SNUGGERY_YARN==="1"?[B,_,J]:[]},ke=we;return Ee;})();
return plugin;
}
};
