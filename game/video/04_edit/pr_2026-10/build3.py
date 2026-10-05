import subprocess, sys
P = sys.argv[1]; FF = P + '/ffmpeg'; FPS = 30; BEAT = 60 / 140
segs = [('chime', 20, 120, 'black', 'A'), ('e1_1', 0, 60, None, 'B1'), ('boss', 10, 60, None, 'B2')]
grid = [('hato', 55, 2, 'flash', 'C1'), ('nori', 84, 2, 'flash', 'C2'), ('boss', 104, 4, 'flash', 'C3'),
        ('tsuri', 112, 4, 'flash', 'D1'), ('roof', 5, 4, 'cut', 'D2'), ('school', 5, 4, 'cut', 'D3'), ('aze', 5, 4, 'cut', 'D4'),
        ('cafe', 8, 4, 'cut', 'D5'), ('wakime', 12, 4, 'cut', 'D6'), ('eye', 5, 4, 'cut', 'D7'), ('barn', 18, 4, 'cut', 'D8'),
        ('arrive', 30, 4, 'flash', 'E1'), ('tetsuya', 110, 2, 'flash', 'E2'), ('yobi', 105, 4, 'flash', 'E3'),
        ('sunrise', 0, 8, 'bigflash', 'F')]
t0 = 8.0; cum = 0
for clip, st, beats, eff, tag in grid:
  a = round((t0 + cum * BEAT) * FPS); cum += beats; b = round((t0 + cum * BEAT) * FPS)
  segs.append((clip, st, b - a, eff, tag))
segs.append(('black', 0, 180, 'none', 'H'))
segs.append(('title2', 4, 160, 'end', 'G'))
t = 0; S = {}
for s in segs: S[s[4]] = t; t += s[2] / FPS
total = t; S['END'] = total
print('total %.2f' % total, {k: round(v, 2) for k, v in S.items()})
args = [FF, '-y', '-loglevel', 'error']; fc = []
for i, (clip, st, n, eff, tag) in enumerate(segs):
  args += ['-framerate', str(FPS), '-start_number', str(st), '-i', f'{P}/clips/{clip}/%04d.png']
  f = f'[{i}:v]trim=end_frame={n},setpts=PTS-STARTPTS,scale=1920:1080:flags=neighbor,format=yuv420p'
  d = n / FPS
  if tag in ('A', 'G', 'F'): f += f",zoompan=z='1+0.00035*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps={FPS}"
  if eff == 'black': f += ',fade=t=in:st=0:d=0.7'
  if eff == 'flash': f += ',fade=t=in:st=0:d=0.18:color=white'
  if eff == 'cut': f += ',fade=t=in:st=0:d=0.08:color=white'
  if eff == 'bigflash': f += ',fade=t=in:st=0:d=0.6:color=white'
  if eff == 'end': f += ',fade=t=in:st=0:d=0.4,fade=t=out:st=%.3f:d=0.9' % (d - 0.9)
  fc.append(f + f'[v{i}]')
fc.append(''.join(f'[v{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=1:a=0[base]')
caps = [('t1', 0.4, 1.9), ('t2', 2.1, 3.95), ('t3', S['B1'] + 0.05, S['B2'] - 0.05), ('b2', S['B2'] + 0.05, S['C1'] - 0.05),
        ('s1', S['C1'] + 0.05, S['C2']), ('s2', S['C2'] + 0.05, S['C3']), ('s4', S['C3'] + 0.05, S['D1']),
        ('h1', S['D1'] + 0.1, S['D3'] - 0.05)]
caps += [(f'L{k}', S[f'D{k}'] + 0.02, S[f'D{k+1}'] if k < 8 else S['E1']) for k in range(1, 9)]
caps += [('t4', S['E1'] + 0.1, S['E2'] - 0.05), ('t5', S['E2'] + 0.05, S['F'] - 0.05), ('t6', S['F'] + 0.5, S['H'] - 0.1),
         ('k1', S['H'] + 0.5, S['G'] - 0.5), ('k2', S['H'] + 1.7, S['G'] - 0.5), ('kk', S['G'] + 1.4, total - 0.2)]
base = len(segs); last = 'base'
for j, (c, a, b) in enumerate(caps):
  args += ['-loop', '1', '-framerate', str(FPS), '-t', '%.3f' % total, '-i', f'{P}/cap/{c}.png']
  fi = 0.05 if c[0] in 'sL' else (0.6 if c in ('k1', 'k2') else 0.3)
  fc.append(f'[{base + j}:v]format=rgba,fade=t=in:st={a:.3f}:d={fi}:alpha=1,fade=t=out:st={b - fi:.3f}:d={fi}:alpha=1[c{j}]')
  fc.append(f'[{last}][c{j}]overlay=enable=\'between(t,{a:.3f},{b:.3f})\'[o{j}]'); last = f'o{j}'
ai = base + len(caps); boss_at = S['C1'] - 1.764; bend = S['H'] - boss_at; stamp_at = S['G'] + 14 / FPS
args += ['-i', f'{P}/audio/chime.wav', '-i', f'{P}/audio/boss30.wav', '-i', f'{P}/audio/victory.wav', '-i', f'{P}/audio/higu16.wav', '-i', f'{P}/audio/chime8.wav', '-i', f'{P}/audio/stamp.wav']
fc.append(f'[{ai}:a]adelay=850|850,volume=0.8[a0]')
fc.append(f'[{ai+1}:a]atrim=0:{bend + 0.4:.3f},afade=t=out:st={bend - 0.5:.3f}:d=0.9,adelay={int(boss_at*1000)}|{int(boss_at*1000)},volume=1.6[a1]')
fc.append(f'[{ai+2}:a]afade=t=out:st=2.6:d=1.6,adelay={int(stamp_at*1000)}|{int(stamp_at*1000)},volume=1.1[a2]')
ch8 = S['H'] + 0.25
fc.append(f'[{ai+4}:a]adelay={int(ch8*1000)}|{int(ch8*1000)},volume=0.75[a4]')
fc.append(f'[{ai+5}:a]adelay={int(stamp_at*1000)}|{int(stamp_at*1000)},volume=1.0[a5]')
fc.append(f'[{ai+3}:a]atrim=1.25:9.5,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.3,afade=t=out:st=5.8:d=1.2,volume=4.5[a3]')
fc.append(f'[a0][a1][a2][a3][a4][a5]amix=inputs=6:normalize=0,atrim=0:{total:.3f},afade=t=out:st={total-1.0:.3f}:d=1.0,volume=1.5,alimiter=limit=0.89:level=disabled,aresample=48000[aout]')
args += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
         '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', '%.3f' % total, sys.argv[2]]
subprocess.run(args, check=True); print('wrote', sys.argv[2])
